import { http, type HttpHandler } from 'msw';

import type { MyOrderDetail } from '../order/schema';
import type { PublicTicketItem } from '../ticket-item/schema';
import {
  buildMockOrder,
  findCheckoutTicket,
  type MockOrderAnswer,
  seededOrders,
  toCheckout,
} from './fixtures/order';
import { errors, fail, ok, readId, requireAuth } from './respond';

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
} as const satisfies Record<string, readonly [number, string]>;
export type OrderErrorCode = keyof typeof ORDER_ERROR_REASONS;

export const orderError = (request: Request, code: OrderErrorCode) => {
  const [status, reason] = ORDER_ERROR_REASONS[code];
  return fail(request, status, code, reason);
};

// ─── 저장소 ──────────────────────────────────────────────────

const orders = new Map<string, MyOrderDetail>(
  Object.values(seededOrders).map((o) => [o.orderUuid, o]),
);
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
  // Bean Validation(@NotNull·@Min·@Max·@AssertTrue) → GLOBAL_400_1
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
    if (eventId === null || ticketItemId === null) return errors.badRequest(request);
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
  default: [checkout, create, detail],
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
