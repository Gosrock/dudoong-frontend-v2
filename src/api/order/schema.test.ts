import { describe, expect, it } from 'vitest';

import {
  CHECKOUT_EVENT_ID,
  CHECKOUT_TICKET,
  findCheckoutTicket,
  seededOrders,
  toCheckout,
} from '../__mocks__/fixtures/order';
import { CheckoutSchema, CreateOrderRequestSchema, MyOrderDetailSchema } from './schema';

/**
 * 주문 스키마. 근거: 백엔드 DTO(dev 24aa595 `V2CheckoutResponse`·`V2MyOrderDetailResponse`·`V2CreateOrderRequest`)와
 * `e2e-tests/test_45_v2_order.py`의 요청·응답.
 */

/** test_45 `test_02_create_orders` 계좌이체 응답에서 단언하는 값을 채운 O-1 응답 모양 */
const test45BankOrder = {
  orderUuid: '7c3f6d0e-0000-0000-0000-000000000001',
  orderNo: 'R1000123',
  status: 'PENDING_APPROVE',
  refundStatus: 'NONE',
  orderedAt: '2026.10.17 20:00',
  approvedAt: null,
  withdrawnAt: null,
  refundStatusChangedAt: null,
  event: {
    eventId: 1,
    name: 'v2주문공연',
    posterImageUrl: null,
    startAt: '2026.11.01 19:00',
    displayStatus: 'UPCOMING',
  },
  ticket: { ticketItemId: 10, name: '일반', payType: 'DUDOONG', unitPrice: 6000 },
  approvalRequired: true,
  quantity: 2,
  paymentChannel: 'BANK_TRANSFER',
  depositorName: '128구구',
  payment: {
    ticketAmount: 12000,
    optionAmount: 2000,
    discountAmount: 0,
    totalAmount: 14000,
    account: { bankName: '신한은행', accountHolder: '고스락', accountNumber: '110-123-456789' },
  },
  lines: [
    {
      quantity: 2,
      linePrice: 14000,
      optionAnswers: [
        { optionName: '뒷풀이', description: '참석?', answer: '예', additionalPrice: 1000 },
        { optionName: '요청사항', description: '요청', answer: '요청', additionalPrice: 0 },
      ],
    },
  ],
  refuseReasonType: null,
  refuseReason: null,
  cancelReason: null,
  refundAccount: null,
  canEditRefundAccount: false,
  refundAccountRequired: false,
  issuedTickets: [],
  canCancel: true,
};

describe('응답 스키마', () => {
  it('O-1 계좌이체 응답(test_45 값)', () => {
    expect(MyOrderDetailSchema.parse(test45BankOrder)).toEqual(test45BankOrder);
  });

  it.each(Object.entries(seededOrders))('O-3 mock 주문(%s)', (_, order) => {
    expect(MyOrderDetailSchema.parse(order)).toEqual(order);
  });

  it('모르는 상태·결제 방식은 UNKNOWN, 숨김 주문 상태 null', () => {
    const parsed = MyOrderDetailSchema.parse({
      ...test45BankOrder,
      status: null,
      paymentChannel: 'CARD',
      refundStatus: 'SOMETHING',
    });
    expect(parsed).toMatchObject({
      status: null,
      paymentChannel: 'UNKNOWN',
      refundStatus: 'UNKNOWN',
    });
  });

  it.each(Object.values(CHECKOUT_TICKET))('O-0 mock 응답(티켓 %s)', (ticketItemId) => {
    const { ticket } = findCheckoutTicket(CHECKOUT_EVENT_ID, ticketItemId);
    const checkout = toCheckout(ticket!);
    expect(CheckoutSchema.parse(checkout)).toEqual(checkout);
  });

  it('O-0 계좌는 두둥 + 구매 가능일 때만', () => {
    const at = (id: number) =>
      toCheckout(findCheckoutTicket(CHECKOUT_EVENT_ID, id).ticket!).account;
    expect(at(CHECKOUT_TICKET.paidWithOptions)).toEqual({
      bankName: '신한은행',
      accountHolder: '고스락',
      accountNumber: '110-123-456789',
    });
    expect(at(CHECKOUT_TICKET.soldOut)).toBeNull();
    expect(at(CHECKOUT_TICKET.freeFcfs)).toBeNull();
  });
});

describe('요청 스키마(P11/O-1) — 엄격', () => {
  const base = {
    eventId: 1,
    ticketItemId: 10,
    quantity: 2,
    options: { applyToAll: true, answers: [{ optionId: 1, answer: 'YES' }] },
    paymentChannel: 'BANK_TRANSFER',
    depositorName: '128구구',
    agreeRefundPolicy: true,
  } as const;

  it('test_45의 일괄·티켓별·무료 본문이 통과', () => {
    expect(CreateOrderRequestSchema.safeParse(base).success).toBe(true);
    expect(
      CreateOrderRequestSchema.safeParse({
        ...base,
        options: { applyToAll: false, answers: [] },
        perTicketOptions: [[{ optionId: 1, answer: 'YES' }], [{ optionId: 1, answer: 'NO' }]],
      }).success,
    ).toBe(true);
    expect(
      CreateOrderRequestSchema.safeParse({
        ...base,
        quantity: 1,
        options: { applyToAll: true, answers: [] },
        paymentChannel: 'FREE',
        depositorName: undefined,
      }).success,
    ).toBe(true);
  });

  it.each([
    ['수량 0', { quantity: 0 }],
    ['수량 101', { quantity: 101 }],
    ['환불 규정 미동의', { agreeRefundPolicy: false }],
    [
      '티켓별인데 묶음 수 ≠ 수량',
      { options: { applyToAll: false, answers: [] }, perTicketOptions: [[]] },
    ],
    ['티켓별인데 perTicketOptions 없음', { options: { applyToAll: false, answers: [] } }],
    ['일괄인데 perTicketOptions도 보냄', { perTicketOptions: [[], []] }],
    ['options 없음(서버가 일괄로 오해)', { options: undefined }],
    ['계좌이체인데 입금자명 없음', { depositorName: undefined }],
    ['입금자명 공백만', { depositorName: '   ' }],
    ['입금자명 21자', { depositorName: '가'.repeat(21) }],
    ['모르는 키', { couponId: 1 }],
  ])('%s → 실패', (_, patch) => {
    expect(CreateOrderRequestSchema.safeParse({ ...base, ...patch }).success).toBe(false);
  });
});
