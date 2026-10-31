import { http, type HttpHandler } from 'msw';

import {
  MY_ORDER_STATUS_FILTERS,
  type MyOrderDetail,
  type MyOrderElement,
  REFUND_ACCOUNT_HOLDER_MAX,
  REFUND_ACCOUNT_NUMBER_MAX,
  REFUND_ACCOUNT_NUMBER_PATTERN,
} from '../order/schema';
import type { PublicTicketItem } from '../ticket-item/schema';
import { banks } from './fixtures/bank';
import {
  buildMockOrder,
  findCheckoutTicket,
  type MockOrderAnswer,
  p9SeededOrders,
  seededOrders,
  toCheckout,
} from './fixtures/order';
import {
  onAudienceOrderChange,
  registerAudienceOrder,
  type StoredGuestOrder,
  syncAudienceCancel,
  syncAudienceRefundAccount,
} from './guest-store';
import { errors, fail, ok, paginate, readId, readPageParams, requireAuth } from './respond';

/**
 * 사용자 주문 — G11/O-0 결제 화면, P11/O-1 주문 생성, G11/O-3 주문 상세. 모두 로그인 필요(액세스 토큰 쿠키).
 * O-1은 백엔드 검증 순서(`V2UserOrderDomainService.create`)를 따라 코드를 내고, 만든 주문을 메모리에 둬 O-3이 같은 값을 돌려준다
 * (새로고침해도 같은 내용 — plan P7). 같은 본문이 10초 안에 다시 오면 앞 주문을 돌려준다.
 */

/** 에러 코드 → 백엔드 문장(error-codes.md). 화면 테스트가 `reason`을 폴백 문구로 쓴다 */
export const ORDER_ERROR_REASONS = {
  Event_404_1: [404, '이벤트를 찾을 수 없습니다.'],
  Event_400_5: [400, '아직 오픈되지 않은 이벤트에는 접근할 수 없습니다.'],
  Event_400_6: [400, '이벤트 시작시간이 지나 티켓팅을 할 수 없습니다.'],
  Ticket_Item_404_1: [404, '티켓 아이템을 찾을 수 없습니다.'],
  Ticket_Item_400_1: [
    400,
    '티켓 상품 재고가 부족합니다. ( 승인 대기 또는 앞선 주문으로 인해, 재고가 있어도 주문이 불가할 수 있습니다.)',
  ],
  Ticket_Item_400_6: [400, '해당 티켓상품 최대 구매 가능 갯수를 넘었습니다.'],
  Ticket_Item_400_10: [400, '지금은 판매 중인 티켓이 아닙니다.'],
  Order_400_15: [
    400,
    '승인 대기중인 주문으로 인해 티켓 최대 구매 가능 횟수를 넘겼습니다.이미 신청한 주문이 승인 될 때까지 기다려주세요.',
  ],
  Order_400_20: [400, '이 티켓은 앱에서 주문할 수 없습니다.'],
  Order_400_21: [400, '티켓에 맞지 않는 결제 방식입니다.'],
  Order_400_22: [400, '입금자명은 1~20자로 입력해 주세요.'],
  Order_400_23: [400, '옵션 답변이 올바르지 않습니다.'],
  Order_400_26: [400, '같은 주문을 처리하고 있습니다. 잠시 후 주문내역을 확인해 주세요.'],
  Order_404_1: [404, '주문을 찾을 수 없습니다.'],
  // P9 취소·환불 계좌(error-codes.md)
  Order_400_5: [400, '주문을 취소할 수 없는 상태입니다.'],
  Order_400_9: [400, '환불을 할 수 있는 기한을 지났습니다.'],
  Order_400_24: [400, '취소할 수 없는 주문입니다.'],
  Order_400_25: [400, '환불 받을 계좌를 입력해 주세요.'],
  Order_400_27: [400, '환불 계좌를 입력할 수 없는 주문입니다.'],
  Order_400_28: [400, '이미 환불이 완료된 주문입니다.'],
} as const satisfies Record<string, readonly [number, string]>;
export type OrderErrorCode = keyof typeof ORDER_ERROR_REASONS;

export const orderError = (request: Request, code: OrderErrorCode) => {
  const [status, reason] = ORDER_ERROR_REASONS[code];
  return fail(request, status, code, reason);
};

// ─── 저장소 ──────────────────────────────────────────────────

/** 시작 값(P7 3분기 + P9 시나리오). 변경(취소·환불 계좌)이 fixture 객체를 건드리지 않게 복사해 넣는다 */
const seedEntries = () =>
  [...Object.values(seededOrders), ...Object.values(p9SeededOrders)].map(
    (o) => [o.orderUuid, structuredClone(o)] as const,
  );
const orders = new Map<string, MyOrderDetail>(seedEntries());

/** 주문 저장소를 시작 값으로 되돌린다(취소·환불 계좌를 바꾸는 vitest의 `beforeEach`) */
export function resetOrderStore() {
  orders.clear();
  for (const [uuid, order] of seedEntries()) orders.set(uuid, order);
  recent.length = 0;
}
/** 중복 요청 판정(같은 본문, 10초) */
const recent: { key: string; at: number; orderUuid: string }[] = [];
const DUPLICATE_WINDOW_MS = 10_000;

/** 이 mock이 만든 주문(테스트에서 응답과 비교) */
export const readMockOrder = (orderUuid: string) => orders.get(orderUuid);

// ─── O-1 본문 검증(백엔드 순서) ───────────────────────────────

type Body = Record<string, unknown>;
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isAnswer = (v: unknown): v is MockOrderAnswer =>
  typeof v === 'object' &&
  v !== null &&
  isInt((v as Body).optionId) &&
  typeof (v as Body).answer === 'string';
const isAnswerList = (v: unknown): v is MockOrderAnswer[] => Array.isArray(v) && v.every(isAnswer);

const YES = ['YES', '예', '네'];
const NO = ['NO', '아니요', '아니오'];

/** `cartAnswers` — 티켓 옵션 전부에 한 번씩, 네/아니오는 YES·NO, 주관식은 trim 1~255자 */
function validAnswers(ticket: PublicTicketItem, answers: MockOrderAnswer[]) {
  const ids = new Set(ticket.options.map((o) => o.optionId));
  if (answers.length !== ids.size || !answers.every((a) => ids.has(a.optionId))) return false;
  if (new Set(answers.map((a) => a.optionId)).size !== answers.length) return false;
  return answers.every((a) => {
    const option = ticket.options.find((o) => o.optionId === a.optionId)!;
    const answer = a.answer.trim();
    if (option.type === 'YES_NO') return [...YES, ...NO].includes(answer.toUpperCase());
    if (option.type === 'SUBJECTIVE') return answer.length >= 1 && answer.length <= 255;
    return false;
  });
}

async function createOrder(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || typeof body !== 'object') return errors.badRequest(request);
  const { eventId, ticketItemId, quantity, options, perTicketOptions } = body;
  const paymentChannel = body.paymentChannel;
  // Bean Validation(@NotNull·@Min·@Max·@AssertTrue) → 400 BAD_REQUEST
  if (!isInt(eventId) || !isInt(ticketItemId) || !isInt(quantity)) {
    return errors.badRequest(request);
  }
  if (quantity < 1 || quantity > 100 || body.agreeRefundPolicy !== true) {
    return errors.badRequest(request);
  }
  if (
    paymentChannel !== 'BANK_TRANSFER' &&
    paymentChannel !== 'TOSS_TRANSFER' &&
    paymentChannel !== 'FREE'
  ) {
    return errors.badRequest(request);
  }
  if (
    perTicketOptions !== undefined &&
    perTicketOptions !== null &&
    !Array.isArray(perTicketOptions)
  ) {
    return errors.badRequest(request);
  }

  const { event, ticket } = findCheckoutTicket(eventId, ticketItemId);
  if (!event) return orderError(request, 'Event_404_1');
  if (!ticket) return orderError(request, 'Ticket_Item_404_1');
  if (event.displayStatus === 'PAST') return orderError(request, 'Event_400_6');
  if (ticket.payType !== 'DUDOONG' && ticket.payType !== 'FREE') {
    return orderError(request, 'Order_400_20');
  }
  if (!ticket.isPurchasable && !ticket.isSoldOut) return orderError(request, 'Ticket_Item_400_10');

  // validatePayment
  let depositorName: string | null = null;
  if (ticket.payType === 'DUDOONG') {
    if (paymentChannel === 'FREE') return orderError(request, 'Order_400_21');
    const name = typeof body.depositorName === 'string' ? body.depositorName.trim() : '';
    if (name.length < 1 || name.length > 20) return orderError(request, 'Order_400_22');
    depositorName = name;
  } else if (paymentChannel !== 'FREE') {
    return orderError(request, 'Order_400_21');
  }

  // cartLines — options 생략 = 일괄
  const opts = (options ?? null) as Body | null;
  const applyToAll = typeof opts?.applyToAll === 'boolean' ? opts.applyToAll : true;
  let answerSets: MockOrderAnswer[][];
  if (applyToAll) {
    const answers = opts?.answers ?? [];
    if (!isAnswerList(answers)) return errors.badRequest(request);
    answerSets = [answers];
  } else {
    const sets = perTicketOptions ?? [];
    if (!Array.isArray(sets) || !sets.every(isAnswerList)) return errors.badRequest(request);
    if (sets.length !== quantity) return orderError(request, 'Order_400_23');
    answerSets = sets;
  }
  if (!answerSets.every((set) => validAnswers(ticket, set))) {
    return orderError(request, 'Order_400_23');
  }

  // findDuplicate — 같은 본문 10초
  const key = JSON.stringify({
    eventId,
    ticketItemId,
    quantity,
    applyToAll,
    answerSets,
    paymentChannel,
    depositorName,
  });
  const now = Date.now();
  const duplicate = recent.find((r) => r.key === key && now - r.at < DUPLICATE_WINDOW_MS);
  if (duplicate) return ok(orders.get(duplicate.orderUuid));

  // Cart 검증 — 1인 제한(이번 수량만 본다. 이미 산 수량은 시나리오 핸들러로) · 재고
  if (ticket.isSoldOut) return orderError(request, 'Ticket_Item_400_1');
  if (ticket.purchaseLimit !== null && quantity > ticket.purchaseLimit) {
    return orderError(request, 'Ticket_Item_400_6');
  }
  if (ticket.remaining !== null && quantity > ticket.remaining) {
    return orderError(request, 'Ticket_Item_400_1');
  }

  const order = buildMockOrder({
    event,
    ticket,
    quantity,
    applyToAll,
    answerSets,
    paymentChannel,
    depositorName,
  });
  orders.set(order.orderUuid, order);
  recent.push({ key, at: now, orderUuid: order.orderUuid });
  // 호스트 예매자 관리(P13a)가 같은 주문을 본다
  registerAudienceOrder(order);
  return ok(order);
}

// ─── 핸들러 ──────────────────────────────────────────────────

const checkout = http.get(
  '*/api/v2/events/:eventId/ticket-items/:ticketItemId/checkout',
  ({ request, params, cookies }) => {
    const denied = requireAuth(request, cookies);
    if (denied) return denied;
    const eventId = readId(params.eventId);
    const ticketItemId = readId(params.ticketItemId);
    if (eventId === null || ticketItemId === null) return errors.typeMismatch(request);
    const { event, ticket } = findCheckoutTicket(eventId, ticketItemId);
    if (!event) return orderError(request, 'Event_404_1');
    // 판매 중이 아니거나 다른 공연 티켓이면 404(`V2ReadCheckoutUseCase`)
    if (!ticket) return orderError(request, 'Ticket_Item_404_1');
    return ok(toCheckout(ticket));
  },
);

const create = http.post('*/api/v2/me/orders', ({ request, cookies }) => {
  return requireAuth(request, cookies) ?? createOrder(request);
});

const detail = http.get('*/api/v2/me/orders/:orderUuid', ({ request, params, cookies }) => {
  const denied = requireAuth(request, cookies);
  if (denied) return denied;
  const order = orders.get(String(params.orderUuid));
  return order ? ok(order) : orderError(request, 'Order_404_1');
});

// ─── P9: O-2 목록 · O-4 취소 · O-5 환불 계좌 ──────────────────

const toElement = (o: MyOrderDetail): MyOrderElement => ({
  orderUuid: o.orderUuid,
  orderNo: o.orderNo,
  event: o.event,
  ticketName: o.ticket.name,
  quantity: o.quantity,
  totalAmount: o.payment?.totalAmount ?? 0,
  status: o.status,
  refundStatus: o.refundStatus,
  orderedAt: o.orderedAt,
});

/** O-2 — 최신 순(나중에 넣은 주문이 먼저). `status` 필터, 페이지 기본 20 · 최대 50(`V2Paging`) */
function listOrders(request: Request, forcedSize?: number) {
  const url = new URL(request.url);
  const paging = readPageParams(url, 20);
  const status = url.searchParams.get('status') ?? 'ALL';
  if (!paging || !(MY_ORDER_STATUS_FILTERS as readonly string[]).includes(status)) {
    return errors.badRequest(request);
  }
  const list = [...orders.values()]
    .reverse()
    .filter((o) => o.status !== null && (status === 'ALL' || o.status === status))
    .map(toElement);
  return ok(paginate(list, paging.page, forcedSize ?? paging.size));
}

type RefundAccountBody = {
  bankCode?: unknown;
  bankName?: unknown;
  accountHolder?: unknown;
  accountNumber?: unknown;
};
const NOT_BLANK = /[^\u0000-\u0020]/;

/**
 * `V2RefundAccountRequest` Bean Validation → 실패면 400 `BAD_REQUEST`. 통과하면 저장 값(은행명은 코드의 표시 이름,
 * 예금주 trim, 계좌번호 공백 제거 — `normalize`). 비면 `null`(→ `Order_400_25`)
 */
function readRefundAccount(raw: unknown): 'invalid' | null | MyOrderDetail['refundAccount'] {
  if (typeof raw !== 'object' || raw === null) return 'invalid';
  const b = raw as RefundAccountBody;
  const bankCode = typeof b.bankCode === 'string' ? b.bankCode : null;
  const bankName = typeof b.bankName === 'string' ? b.bankName : null;
  const holder = b.accountHolder;
  const number = b.accountNumber;
  if (
    typeof holder !== 'string' ||
    !NOT_BLANK.test(holder) ||
    holder.length > REFUND_ACCOUNT_HOLDER_MAX
  )
    return 'invalid';
  if (
    typeof number !== 'string' ||
    number.length > REFUND_ACCOUNT_NUMBER_MAX ||
    !REFUND_ACCOUNT_NUMBER_PATTERN.test(number)
  ) {
    return 'invalid';
  }
  const bank = bankCode === null ? null : banks.find((x) => x.code === bankCode);
  if (bankCode !== null && !bank) return 'invalid'; // 모르는 코드
  if (bankCode === null && (bankName === null || !NOT_BLANK.test(bankName) || bankName.length > 20))
    return 'invalid';
  const name = (bank?.name ?? bankName ?? '').trim();
  const digits = number.replace(/\s/g, '');
  if (!name || !holder.trim() || !digits) return null;
  return {
    bankName: name,
    bankCode: bank?.code ?? null,
    accountHolder: holder.trim(),
    maskedAccountNumber: `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`,
  };
}

const isPaid = (o: MyOrderDetail) => (o.payment?.totalAmount ?? 0) > 0;
const NOW = '2026.10.25 12:00';

/** `cancelBlocker` 순서를 플래그로 흉내 낸다: 상태 → 공연(삭제·시작 후) → 그 밖(입장·선물 티켓) */
function cancelBlockCode(o: MyOrderDetail) {
  if (o.status !== 'PENDING_APPROVE' && o.status !== 'APPROVED') return 'Order_400_5' as const;
  if (o.event === null || o.event.displayStatus === 'PAST' || o.event.displayStatus === 'ONGOING') {
    return 'Order_400_9' as const;
  }
  return 'Order_400_24' as const;
}

async function cancelOrder(request: Request, orderUuid: string) {
  const order = orders.get(orderUuid);
  if (!order) return orderError(request, 'Order_404_1');
  const text = await request.text();
  let body: { refundAccount?: unknown } | null = null;
  try {
    body = text ? (JSON.parse(text) as { refundAccount?: unknown }) : null;
  } catch {
    return errors.badRequest(request);
  }
  // @Valid — 계좌가 있으면 먼저 검증한다
  const account =
    body?.refundAccount === undefined || body.refundAccount === null
      ? null
      : readRefundAccount(body.refundAccount);
  if (account === 'invalid') return errors.badRequest(request);
  if (!order.canCancel) return orderError(request, cancelBlockCode(order));
  const paid = isPaid(order);
  if (paid && !account) return orderError(request, 'Order_400_25');
  const next: MyOrderDetail = {
    ...order,
    status: paid ? 'REFUNDED' : 'CANCELED',
    refundStatus: paid ? 'REQUESTED' : 'NONE',
    withdrawnAt: NOW,
    refundStatusChangedAt: paid ? NOW : order.refundStatusChangedAt,
    refundAccount: paid ? (order.refundAccount ?? account) : order.refundAccount,
    canEditRefundAccount: paid,
    refundAccountRequired: false,
    canCancel: false,
    issuedTickets: order.issuedTickets.map((t) => ({ ...t, entrance: 'CANCELED' as const })),
  };
  orders.set(orderUuid, next);
  syncAudienceCancel(
    orderUuid,
    next,
    paid && !order.refundAccount ? rawAccountOf(body, account) : null,
  );
  return ok(next);
}

async function putRefundAccount(request: Request, orderUuid: string) {
  const order = orders.get(orderUuid);
  if (!order) return orderError(request, 'Order_404_1');
  const body = (await request.json().catch(() => null)) as unknown;
  const account = readRefundAccount(body);
  if (account === 'invalid') return errors.badRequest(request);
  if (!order.canEditRefundAccount) {
    return orderError(
      request,
      order.refundStatus === 'COMPLETED' ? 'Order_400_28' : 'Order_400_27',
    );
  }
  if (!account) return orderError(request, 'Order_400_25');
  const next: MyOrderDetail = { ...order, refundAccount: account, refundAccountRequired: false };
  orders.set(orderUuid, next);
  const raw = rawAccountOf({ refundAccount: body }, account);
  if (raw) syncAudienceRefundAccount(orderUuid, raw);
  return ok(next);
}

/** 호스트 화면(GR-2·GF-1)이 보는 원본 계좌 — 매니저 이상에게는 가리지 않는다. 계좌번호는 서버처럼 공백을 지운다 */
function rawAccountOf(body: unknown, account: MyOrderDetail['refundAccount'] | null) {
  const raw = (body as { refundAccount?: { accountNumber?: unknown } } | null)?.refundAccount;
  if (!account || typeof raw?.accountNumber !== 'string') return null;
  return {
    bankName: account.bankName,
    bankCode: account.bankCode,
    accountHolder: account.accountHolder,
    accountNumber: raw.accountNumber.replace(/\s/g, ''),
  };
}

// ─── 호스트 처리(P13a) → 관객 O-3 ─────────────────────────────

/**
 * 호스트 승인·거절·승인 후 취소·환불 완료(`guest-store.ts`)를 관객 주문에 옮긴다(`V2ReadMyOrdersUseCase.detail` 판정).
 * 사용자 분류: 승인 → APPROVED + 발급 티켓, 거절 → REFUSED, 승인 후 호스트 취소 → CANCELED(사용자 취소는 O-4가 이미 REFUNDED·CANCELED)
 */
function applyHostChange(h: StoredGuestOrder) {
  const o = orders.get(h.orderUuid);
  if (!o) return;
  let next: MyOrderDetail = { ...o };
  if (h.status === 'APPROVED' && o.status === 'PENDING_APPROVE') {
    next = {
      ...next,
      status: 'APPROVED',
      approvedAt: h.approvedAt,
      issuedTickets: h.issuedTickets.map((t) => ({
        ticketUuid: t.ticketUuid,
        issuedTicketNo: t.issuedTicketNo,
        ticketName: h.ticketName,
        entrance: 'BEFORE' as const,
        enteredAt: null,
        optionAnswers: t.optionAnswers,
        giftState: 'NONE' as const,
        isGiftExpired: false,
        giftId: null,
      })),
    };
  } else if (h.status === 'REFUSED' && o.status === 'PENDING_APPROVE') {
    next = {
      ...next,
      status: 'REFUSED',
      refuseReasonType: h.refuseReasonType,
      refuseReason: h.reasonText,
      withdrawnAt: h.withdrawnAt,
      canCancel: false,
    };
  } else if (h.status === 'CANCELED' && o.status === 'APPROVED') {
    next = {
      ...next,
      status: 'CANCELED',
      cancelReason: h.reasonText,
      withdrawnAt: h.withdrawnAt,
      canCancel: false,
      issuedTickets: o.issuedTickets.map((t) => ({ ...t, entrance: 'CANCELED' as const })),
    };
  }
  const canEdit = isPaid(next) && h.refundStatus === 'REQUESTED';
  next = {
    ...next,
    refundStatus: h.refundStatus,
    refundStatusChangedAt: h.refundStatusChangedAt,
    canEditRefundAccount: canEdit,
    refundAccountRequired:
      canEdit && next.refundAccount === null && next.refuseReasonType !== 'DEPOSIT_UNCONFIRMED',
  };
  orders.set(h.orderUuid, next);
}
onAudienceOrderChange(applyHostChange);

const list = http.get('*/api/v2/me/orders', ({ request, cookies }) => {
  return requireAuth(request, cookies) ?? listOrders(request);
});

const cancel = http.post('*/api/v2/me/orders/:orderUuid/cancel', ({ request, params, cookies }) => {
  return requireAuth(request, cookies) ?? cancelOrder(request, String(params.orderUuid));
});

const refundAccount = http.put(
  '*/api/v2/me/orders/:orderUuid/refund-account',
  ({ request, params, cookies }) => {
    return requireAuth(request, cookies) ?? putRefundAccount(request, String(params.orderUuid));
  },
);

/** O-1이 언제나 이 코드로 실패한다 */
const createFails = (code: OrderErrorCode): HttpHandler[] => [
  http.post('*/api/v2/me/orders', ({ request }) => orderError(request, code)),
];

/** 무료 선착순 확정 실패 — 주문이 아니라 원래 에러(재고)가 온다(`V2CreateOrderUseCase`). 다른 티켓은 기본 처리로 넘긴다 */
const freeFcfsConfirmFails: HttpHandler[] = [
  http.post('*/api/v2/me/orders', async ({ request }) => {
    const body = (await request.clone().json()) as Body;
    const { ticket } = findCheckoutTicket(Number(body.eventId), Number(body.ticketItemId));
    if (ticket?.payType === 'FREE' && !ticket.approvalRequired) {
      return orderError(request, 'Ticket_Item_400_1');
    }
    return undefined;
  }),
];

/**
 * 동의 강제를 켠 백엔드(`agreement.enforce=true`, #840). `hostProvisionAgreed`가 `true`가 아니거나, 두둥티켓 주문인데
 * `dudoongTicketNoticeConfirmed`가 `true`가 아니면 400 `Agreement_400_1`(`AgreementService.requireOrderAgreements` @432cce4).
 * 통과하면 기본 처리로 넘긴다
 */
const agreementEnforced: HttpHandler[] = [
  http.post('*/api/v2/me/orders', async ({ request }) => {
    const body = (await request.clone().json()) as Body;
    const { ticket } = findCheckoutTicket(Number(body.eventId), Number(body.ticketItemId));
    const dudoong = ticket?.payType === 'DUDOONG';
    if (
      body.hostProvisionAgreed !== true ||
      (dudoong && body.dudoongTicketNoticeConfirmed !== true)
    ) {
      return errors.agreementRequired(request);
    }
    return undefined;
  }),
];

/**
 * 이름 붙인 세트(plan §0). 테스트는 `server.use(...orderHandlers.createFails('Order_400_22'))`처럼 앞에 끼운다.
 * - `default` — 기본 목록(`handlers.ts`)에 들어 있는 O-0·O-1·O-3
 * - `checkout(patch)` — O-0이 티켓 값을 바꿔 응답(재고 갱신 등)
 */
export const orderHandlers = {
  default: [checkout, create, detail, list, cancel, refundAccount],
  /** O-2 페이지 크기를 `size`로 고정(무한 스크롤 시나리오 — 기본 20보다 작게) */
  listWithPageSize: (size: number): HttpHandler[] => [
    http.get('*/api/v2/me/orders', ({ request }) => listOrders(request, size)),
  ],
  /** O-2 두 번째 페이지부터 5xx */
  listNextPageError: [
    http.get('*/api/v2/me/orders', ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page') ?? 0);
      return page > 0 ? errors.serverError(request) : undefined;
    }),
  ] as HttpHandler[],
  /** O-4가 언제나 이 코드로 실패한다(주문은 그대로) */
  cancelFails: (code: OrderErrorCode): HttpHandler[] => [
    http.post('*/api/v2/me/orders/:orderUuid/cancel', ({ request }) => orderError(request, code)),
  ],
  /**
   * 경합 — [주문취소]를 누르기 직전에 이 주문의 티켓 하나가 선물 대기가 됐다. 저장된 주문을 선물 대기(`canCancel=false`)로
   * 바꾸고 `Order_400_24`를 낸다(다시 읽으면 선물 안내 조건에 맞는다)
   */
  cancelRaceWithGift: [
    http.post('*/api/v2/me/orders/:orderUuid/cancel', ({ request, params }) => {
      const order = orders.get(String(params.orderUuid));
      if (!order) return orderError(request, 'Order_404_1');
      orders.set(order.orderUuid, {
        ...order,
        canCancel: false,
        issuedTickets: order.issuedTickets.map((t, i) =>
          i === 0 ? { ...t, giftState: 'PENDING' as const, giftId: 9999 } : t,
        ),
      });
      return orderError(request, 'Order_400_24');
    }),
  ] as HttpHandler[],
  /** O-5가 언제나 이 코드로 실패한다 */
  refundAccountFails: (code: OrderErrorCode): HttpHandler[] => [
    http.put('*/api/v2/me/orders/:orderUuid/refund-account', ({ request }) =>
      orderError(request, code),
    ),
  ],
  createFails,
  freeFcfsConfirmFails,
  agreementEnforced,
  checkoutWith: (patch: Partial<PublicTicketItem>): HttpHandler[] => [
    http.get(
      '*/api/v2/events/:eventId/ticket-items/:ticketItemId/checkout',
      ({ request, params }) => {
        const { ticket } = findCheckoutTicket(Number(params.eventId), Number(params.ticketItemId));
        if (!ticket) return orderError(request, 'Ticket_Item_404_1');
        return ok(toCheckout({ ...ticket, ...patch }));
      },
    ),
  ],
  checkoutNotFound: [
    http.get('*/api/v2/events/:eventId/ticket-items/:ticketItemId/checkout', ({ request }) =>
      orderError(request, 'Ticket_Item_404_1'),
    ),
  ],
};
