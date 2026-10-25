import type { Account, Checkout, MyOrderDetail, PaymentChannel } from '../../order/schema';
import type { PublicTicketItem } from '../../ticket-item/schema';
import { findPublicEvent, type MockEvent } from './event';

/**
 * 주문 fixture(G11/O-0, P11/O-1, G11/O-3). 근거: 백엔드 `V2CheckoutResponse`·`V2MyOrderDetailResponse`·
 * `V2UserOrderDomainService`(dev 24aa595)와 `e2e-tests/test_45_v2_order.py`의 요청·응답(계좌 값, 금액, 상태 3분기).
 *
 * **금액은 백엔드 식으로 따로 계산한다** — `src/api/order/price.ts`를 부르지 않는다. 화면 총액 == 응답 `totalAmount`
 * 계약 테스트(plan P7)가 두 구현을 맞대어 보게 하려는 것이다.
 */

/**
 * 두둥티켓 입금 계좌(test_45 `ACCOUNT`). 은행명은 호스트 자유 입력이다(backend-questions B3).
 * `bankCode`는 서버가 은행명으로 추정한 값(#804 — `BankCode.fromName("신한은행")` = SHINHAN `088`)
 */
export const MOCK_ACCOUNT: Account = {
  bankName: '신한은행',
  bankCode: '088',
  accountHolder: '고스락',
  accountNumber: '110-123-456789',
};

/**
 * 체크아웃 시나리오용 티켓. 공연 fixture(`fixtures/event.ts`)의 티켓에 없는 조합만 더한다 — GP-5 기본 응답에는 나오지 않고
 * O-0·O-1 mock만 안다(공연 101 소속). GP-5까지 맞춰야 하는 테스트는 `ticketItemHandlers.checkoutCatalog`를 쓴다.
 */
export const extraCheckoutTickets: PublicTicketItem[] = [
  {
    ticketItemId: 504,
    name: '스탠딩',
    description: '옵션 없는 유료 티켓',
    price: 6000,
    payType: 'DUDOONG',
    approvalRequired: true,
    remaining: 3,
    isSoldOut: false,
    isPurchasable: true,
    purchaseLimit: null,
    options: [],
  },
  {
    ticketItemId: 505,
    name: '무료 승인',
    description: '호스트 승인 후 확정',
    price: 0,
    payType: 'FREE',
    approvalRequired: true,
    remaining: 10,
    isSoldOut: false,
    isPurchasable: true,
    purchaseLimit: 2,
    options: [
      {
        optionId: 702,
        name: '응원하는 멤버',
        description: '한 명만 적어 주세요',
        type: 'SUBJECTIVE',
        yesAdditionalPrice: null,
      },
    ],
  },
];

/** 시나리오에서 부르는 티켓 id(공연 101) */
export const CHECKOUT_TICKET = {
  /** 두둥 · 옵션 2개(네/아니오 +10,000원, 주관식) · 1인 4매 · 잔여 42 */
  paidWithOptions: 501,
  /** 두둥 · 매진 */
  soldOut: 502,
  /** 무료 선착순(승인 없음) · 잔여 비공개 */
  freeFcfs: 503,
  /** 두둥 · 옵션 없음 · 잔여 3 */
  paidNoOptions: 504,
  /** 무료 승인형 · 주관식 옵션 1개 */
  freeApproval: 505,
} as const;

export const CHECKOUT_EVENT_ID = 101;

/** 공연 + 그 공연의 판매 중 티켓(체크아웃 mock이 보는 범위) */
export function findCheckoutTicket(eventId: number, ticketItemId: number) {
  const event = findPublicEvent(eventId);
  if (!event) return { event: undefined, ticket: undefined };
  const tickets =
    eventId === CHECKOUT_EVENT_ID
      ? [...event.ticketItems, ...extraCheckoutTickets]
      : event.ticketItems;
  return { event, ticket: tickets.find((t) => t.ticketItemId === ticketItemId) };
}

/** O-0 응답. 계좌는 두둥티켓 + 지금 살 수 있을 때만(`V2ReadCheckoutUseCase`) */
export function toCheckout(ticket: PublicTicketItem): Checkout {
  return {
    ticket,
    account: ticket.payType === 'DUDOONG' && ticket.isPurchasable ? MOCK_ACCOUNT : null,
  };
}

// ─── 주문 만들기(백엔드 식) ───────────────────────────────────

export type MockOrderAnswer = { optionId: number; answer: string };

export type MockOrderInput = {
  event: MockEvent;
  ticket: PublicTicketItem;
  quantity: number;
  /** 일괄이면 1개(수량 전체), 티켓별이면 수량만큼(각 1장) */
  applyToAll: boolean;
  answerSets: MockOrderAnswer[][];
  paymentChannel: PaymentChannel;
  depositorName: string | null;
};

const KR_YES = '예';
const KR_NO = '아니요';

let sequence = 0;

/**
 * `V2UserOrderDomainService.create` + `V2ReadMyOrdersUseCase.detail`을 흉내 낸다.
 * - 줄: 일괄 → 수량 N 줄 1개, 티켓별 → 수량 1 줄 N개(`cartLines`)
 * - 줄 금액 = (가격 + Σ YES 추가금) × 줄 수량, `ticketAmount` = Σ 가격 × 수량, `optionAmount` = Σ 추가금 × 수량
 * - 유료(총액 > 0)만 `payment`, 계좌는 승인형(두둥) 주문만
 * - 상태: 두둥 → 승인 대기 / 무료 승인형 → 승인 대기 / 무료 선착순 → 즉시 발급(APPROVED + 발급 티켓 N장)
 */
export function buildMockOrder(input: MockOrderInput): MyOrderDetail {
  sequence += 1;
  const { event, ticket, quantity } = input;
  const optionById = new Map(ticket.options.map((o) => [o.optionId, o]));
  const lines = (input.applyToAll ? [input.answerSets[0] ?? []] : input.answerSets).map(
    (answers) => {
      const lineQuantity = input.applyToAll ? quantity : 1;
      const optionAnswers = answers.map((a) => {
        const option = optionById.get(a.optionId);
        const yesNo = option?.type === 'YES_NO';
        const isYes = yesNo && a.answer.trim().toUpperCase() === 'YES';
        return {
          optionName: option?.name ?? null,
          description: option?.description ?? null,
          answer: yesNo ? (isYes ? KR_YES : KR_NO) : a.answer.trim(),
          additionalPrice: isYes ? (option?.yesAdditionalPrice ?? 0) : 0,
        };
      });
      const optionPrice = optionAnswers.reduce((acc, a) => acc + a.additionalPrice, 0);
      return {
        quantity: lineQuantity,
        linePrice: (ticket.price + optionPrice) * lineQuantity,
        optionAnswers,
        optionPrice,
      };
    },
  );
  const ticketAmount = lines.reduce((acc, l) => acc + ticket.price * l.quantity, 0);
  const optionAmount = lines.reduce((acc, l) => acc + l.optionPrice * l.quantity, 0);
  const totalAmount = ticketAmount + optionAmount;
  const approval = ticket.payType === 'DUDOONG' || ticket.approvalRequired;
  const status = approval ? 'PENDING_APPROVE' : 'APPROVED';
  const orderUuid = `mock-order-${String(sequence).padStart(4, '0')}-${Math.random().toString(16).slice(2, 10)}`;
  return {
    orderUuid,
    orderNo: `R${1_000_000 + sequence}`,
    status,
    refundStatus: 'NONE',
    orderedAt: '2026.10.17 20:00',
    approvedAt: approval ? null : '2026.10.17 20:00',
    withdrawnAt: null,
    refundStatusChangedAt: null,
    event: {
      eventId: event.eventId,
      name: event.name,
      posterImageUrl: event.posterImageUrl,
      startAt: event.startAt,
      displayStatus: event.displayStatus,
    },
    ticket: {
      ticketItemId: ticket.ticketItemId,
      name: ticket.name,
      payType: ticket.payType,
      unitPrice: ticket.price,
    },
    approvalRequired: approval,
    quantity,
    paymentChannel: input.paymentChannel,
    depositorName: ticket.payType === 'DUDOONG' ? input.depositorName : null,
    payment:
      totalAmount > 0
        ? {
            ticketAmount,
            optionAmount,
            discountAmount: 0,
            totalAmount,
            account: approval && ticket.payType === 'DUDOONG' ? MOCK_ACCOUNT : null,
          }
        : null,
    lines: lines.map(({ quantity: q, linePrice, optionAnswers }) => ({
      quantity: q,
      linePrice,
      optionAnswers,
    })),
    refuseReasonType: null,
    refuseReason: null,
    cancelReason: null,
    refundAccount: null,
    canEditRefundAccount: false,
    refundAccountRequired: false,
    issuedTickets: approval
      ? []
      : Array.from({ length: quantity }, (_, i) => ({
          ticketUuid: `${orderUuid}-t${i + 1}`,
          issuedTicketNo: `T${1_000_000 + sequence * 100 + i}`,
          ticketName: ticket.name,
          entrance: 'BEFORE' as const,
          enteredAt: null,
          optionAnswers: lines[input.applyToAll ? 0 : i]?.optionAnswers ?? [],
          giftState: 'NONE' as const,
          isGiftExpired: false,
          giftId: null,
        })),
    canCancel: event.displayStatus !== 'PAST',
  };
}

/** 미리 만들어 둔 주문(G11/O-3 직접 조회용) — 3분기 하나씩 */
function seed() {
  const event = findPublicEvent(CHECKOUT_EVENT_ID)!;
  const ticket = (id: number) => findCheckoutTicket(CHECKOUT_EVENT_ID, id).ticket!;
  return {
    transfer: buildMockOrder({
      event,
      ticket: ticket(CHECKOUT_TICKET.paidWithOptions),
      quantity: 2,
      applyToAll: true,
      answerSets: [
        [
          { optionId: 701, answer: 'YES' },
          { optionId: 702, answer: '보컬' },
        ],
      ],
      paymentChannel: 'BANK_TRANSFER',
      depositorName: '두둥이',
    }),
    freeApproval: buildMockOrder({
      event,
      ticket: ticket(CHECKOUT_TICKET.freeApproval),
      quantity: 1,
      applyToAll: true,
      answerSets: [[{ optionId: 702, answer: '드럼' }]],
      paymentChannel: 'FREE',
      depositorName: null,
    }),
    freeFcfs: buildMockOrder({
      event,
      ticket: ticket(CHECKOUT_TICKET.freeFcfs),
      quantity: 2,
      applyToAll: true,
      answerSets: [[]],
      paymentChannel: 'FREE',
      depositorName: null,
    }),
  };
}

export const seededOrders = seed();

/** 404를 내는 주문 uuid(없음 · 남의 주문) */
export const MISSING_ORDER_UUID = 'mock-order-missing';

// ─── 마이페이지(P9) 시나리오 주문 ─────────────────────────────

/**
 * P9 주문상세·취소·환불 계좌 시나리오. 근거: 백엔드 `V2UserOrderDomainService.cancelBlocker`·`refundAccountBlocker`·
 * `isRefundAccountRequired`, `V2MyOrderStatus.of`, `V2ReadMyOrdersUseCase.detail`(@432cce4). 플래그(`canCancel` 등)는
 * 서버가 계산한 값처럼 fixture에 고정한다 — 화면은 플래그만 보고 그린다(patterns §20).
 */
export const P9_ORDER = {
  /** 두둥 · 승인 완료 · 2장(입장 전, 선물 없음) · 취소 가능 → 계좌 입력 후 환불 요청 */
  approvedPaid: 'mock-order-p9-approved-paid',
  /** 두둥 · 승인 완료 · 선물 대기 티켓 1장 → 취소 불가 + 선물 안내 */
  giftPending: 'mock-order-p9-gift-pending',
  /** 두둥 · 승인 완료 · 선물 완료(SENT, uuid 없음) 1장 → 취소 불가 + 선물 안내 */
  giftSent: 'mock-order-p9-gift-sent',
  /** 두둥 · 승인 완료 · 입장 1장 + 선물 대기 1장 → 취소 불가, 선물 안내 없음(선물을 정리해도 못 취소) */
  enteredWithGift: 'mock-order-p9-entered-gift',
  /** 지난 공연(90) · 승인 완료 · 선물 대기(만료) → 취소 불가, 선물 안내 없음 */
  pastWithGift: 'mock-order-p9-past',
  /** 거절(결제 금액 오류) · 환불 요청 · 계좌 없음 → 입력 유도 */
  refusedAmount: 'mock-order-p9-refused-amount',
  /** 거절(입금 미확인) · 환불 요청 · 계좌 없음 → 입구만, 유도 없음 */
  refusedDeposit: 'mock-order-p9-refused-deposit',
  /** 거절(ETC — 호스트가 쓴 사유) · 환불 요청 · 계좌 없음 */
  refusedEtc: 'mock-order-p9-refused-etc',
  /** 무료 승인형 거절 — 돌려줄 돈이 없어 환불 대상 아님 */
  refusedFree: 'mock-order-p9-refused-free',
  /** 승인 후 호스트 취소 · 환불 요청 · 계좌 없음 → 입력 유도 */
  hostCanceled: 'mock-order-p9-host-canceled',
  /** 사용자 취소 · 환불 요청 · 계좌 있음(마스킹) → 수정 입구 */
  refundRequested: 'mock-order-p9-refund-requested',
  /** 사용자 취소 · 환불 요청 · 옛 자유 입력 계좌(`bankCode` null) → 수정 폼에서 은행을 다시 고른다 */
  refundRequestedLegacyBank: 'mock-order-p9-refund-legacy-bank',
  /** 사용자 취소 · 환불 완료 → 입구 없음 */
  refundCompleted: 'mock-order-p9-refund-completed',
  /** 무료 주문 사용자 취소(환불 없음) */
  canceledFree: 'mock-order-p9-canceled-free',
  /** 삭제된 공연의 주문(#789 — 200 + `event: null`, 취소 불가) */
  deletedEvent: 'mock-order-p9-deleted-event',
} as const;

/** P9 시나리오의 내 환불 계좌(마스킹 — 뒤 4자리만) */
export const MOCK_MY_REFUND_ACCOUNT = {
  bankName: '신한은행',
  bankCode: '088',
  accountHolder: '두둥이',
  maskedAccountNumber: '******6789',
};

function p9Orders(): MyOrderDetail[] {
  const event101 = findPublicEvent(CHECKOUT_EVENT_ID)!;
  const event90 = findPublicEvent(90)!;
  const paid = findCheckoutTicket(CHECKOUT_EVENT_ID, CHECKOUT_TICKET.paidNoOptions).ticket!;
  const freeApproval = findCheckoutTicket(CHECKOUT_EVENT_ID, CHECKOUT_TICKET.freeApproval).ticket!;
  const freeFcfs = findCheckoutTicket(CHECKOUT_EVENT_ID, CHECKOUT_TICKET.freeFcfs).ticket!;

  const make = (
    orderUuid: string,
    orderNo: string,
    opts: {
      event?: MockEvent;
      ticket?: PublicTicketItem;
      quantity?: number;
      approved?: boolean;
      tickets?: Partial<MyOrderDetail['issuedTickets'][number]>[];
    },
    patch: Partial<MyOrderDetail>,
  ): MyOrderDetail => {
    const ticket = opts.ticket ?? paid;
    const free = ticket.payType === 'FREE';
    const quantity = opts.quantity ?? opts.tickets?.length ?? 1;
    const built = buildMockOrder({
      event: opts.event ?? event101,
      ticket,
      quantity,
      applyToAll: true,
      answerSets: [ticket.options.map((o) => ({ optionId: o.optionId, answer: '보컬' }))],
      paymentChannel: free ? 'FREE' : 'BANK_TRANSFER',
      depositorName: free ? null : '두둥이',
    });
    const issuedTickets = (opts.tickets ?? []).map((t, i) => ({
      ticketUuid: `${orderUuid}-t${i + 1}`,
      issuedTicketNo: `T${orderNo.slice(1)}${i + 1}`,
      ticketName: ticket.name,
      entrance: 'BEFORE' as const,
      enteredAt: null,
      optionAnswers: built.lines[0]?.optionAnswers ?? [],
      giftState: 'NONE' as const,
      isGiftExpired: false,
      giftId: null,
      ...t,
    }));
    return {
      ...built,
      orderUuid,
      orderNo,
      ...(opts.approved && { status: 'APPROVED' as const, approvedAt: '2026.10.18 10:00' }),
      issuedTickets,
      ...patch,
    };
  };

  const refused = (
    uuid: string,
    no: string,
    reasonType: MyOrderDetail['refuseReasonType'],
    patch: Partial<MyOrderDetail> = {},
  ) =>
    make(
      uuid,
      no,
      {},
      {
        status: 'REFUSED',
        refundStatus: 'REQUESTED',
        withdrawnAt: '2026.10.18 11:00',
        refundStatusChangedAt: '2026.10.18 11:00',
        refuseReasonType: reasonType,
        refuseReason: null,
        canEditRefundAccount: true,
        refundAccountRequired: reasonType !== 'DEPOSIT_UNCONFIRMED',
        canCancel: false,
        ...patch,
      },
    );

  const userRefund = (
    uuid: string,
    no: string,
    refundStatus: 'REQUESTED' | 'COMPLETED',
    account: MyOrderDetail['refundAccount'],
  ) =>
    make(
      uuid,
      no,
      { approved: true, quantity: 1, tickets: [{ entrance: 'CANCELED' }] },
      {
        status: 'REFUNDED',
        refundStatus,
        withdrawnAt: '2026.10.19 09:00',
        refundStatusChangedAt:
          refundStatus === 'REQUESTED' ? '2026.10.19 09:00' : '2026.10.20 15:00',
        refundAccount: account,
        canEditRefundAccount: refundStatus === 'REQUESTED',
        refundAccountRequired: false,
        canCancel: false,
      },
    );

  return [
    make(
      P9_ORDER.approvedPaid,
      'R9000001',
      { approved: true, tickets: [{}, {}] },
      { canCancel: true },
    ),
    make(
      P9_ORDER.giftPending,
      'R9000002',
      { approved: true, tickets: [{ giftState: 'PENDING', giftId: 9101 }, {}] },
      { canCancel: false },
    ),
    make(
      P9_ORDER.giftSent,
      'R9000003',
      { approved: true, tickets: [{ giftState: 'SENT', giftId: 9102, ticketUuid: null }, {}] },
      { canCancel: false },
    ),
    make(
      P9_ORDER.enteredWithGift,
      'R9000004',
      {
        approved: true,
        tickets: [
          { entrance: 'DONE', enteredAt: '2026.10.20 18:00' },
          { giftState: 'PENDING', giftId: 9103 },
        ],
      },
      { canCancel: false },
    ),
    make(
      P9_ORDER.pastWithGift,
      'R9000005',
      {
        event: event90,
        approved: true,
        tickets: [
          { entrance: 'DONE', enteredAt: '2026.05.16 17:40' },
          { giftState: 'PENDING', giftId: 9104, isGiftExpired: true },
        ],
      },
      { canCancel: false },
    ),
    refused(P9_ORDER.refusedAmount, 'R9000006', 'AMOUNT_MISMATCH'),
    refused(P9_ORDER.refusedDeposit, 'R9000007', 'DEPOSIT_UNCONFIRMED'),
    refused(P9_ORDER.refusedEtc, 'R9000008', 'ETC', { refuseReason: '공연 일정 변경' }),
    make(
      P9_ORDER.refusedFree,
      'R9000009',
      { ticket: freeApproval },
      {
        status: 'REFUSED',
        refundStatus: 'NONE',
        withdrawnAt: '2026.10.18 11:00',
        refuseReasonType: 'SOLD_OUT',
        canCancel: false,
      },
    ),
    make(
      P9_ORDER.hostCanceled,
      'R9000010',
      { approved: true, tickets: [{ entrance: 'CANCELED' }] },
      {
        status: 'CANCELED',
        refundStatus: 'REQUESTED',
        withdrawnAt: '2026.10.19 12:00',
        refundStatusChangedAt: '2026.10.19 12:00',
        cancelReason: '공연장 사정으로 공연이 취소되었어요',
        canEditRefundAccount: true,
        refundAccountRequired: true,
        canCancel: false,
      },
    ),
    userRefund(P9_ORDER.refundRequested, 'R9000011', 'REQUESTED', MOCK_MY_REFUND_ACCOUNT),
    userRefund(P9_ORDER.refundRequestedLegacyBank, 'R9000012', 'REQUESTED', {
      bankName: '새마을',
      bankCode: null,
      accountHolder: '두둥이',
      maskedAccountNumber: '******1234',
    }),
    userRefund(P9_ORDER.refundCompleted, 'R9000013', 'COMPLETED', MOCK_MY_REFUND_ACCOUNT),
    make(
      P9_ORDER.canceledFree,
      'R9000014',
      { ticket: freeFcfs, approved: true, quantity: 1, tickets: [{ entrance: 'CANCELED' }] },
      {
        status: 'CANCELED',
        refundStatus: 'NONE',
        withdrawnAt: '2026.10.19 09:30',
        canCancel: false,
      },
    ),
    make(
      P9_ORDER.deletedEvent,
      'R9000015',
      { approved: true, tickets: [{}] },
      { event: null, canCancel: false },
    ),
  ];
}

/** P9 시나리오 주문(uuid → 주문). O-2·O-3 mock의 시작 값 */
export const p9SeededOrders: Record<string, MyOrderDetail> = Object.fromEntries(
  p9Orders().map((o) => [o.orderUuid, o]),
);
