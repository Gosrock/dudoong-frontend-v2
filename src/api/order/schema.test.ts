import { describe, expect, it } from 'vitest';

import {
  CHECKOUT_EVENT_ID,
  CHECKOUT_TICKET,
  findCheckoutTicket,
  p9SeededOrders,
  seededOrders,
  toCheckout,
} from '../__mocks__/fixtures/order';
import {
  CancelMyOrderRequestSchema,
  CheckoutSchema,
  CreateOrderRequestSchema,
  MyOrderDetailSchema,
  MyOrderPageSchema,
  RefundAccountRequestSchema,
} from './schema';

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
    account: {
      bankName: '신한은행',
      bankCode: '088',
      accountHolder: '고스락',
      accountNumber: '110-123-456789',
    },
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
      bankCode: '088',
      accountHolder: '고스락',
      accountNumber: '110-123-456789',
    });
    expect(at(CHECKOUT_TICKET.soldOut)).toBeNull();
    expect(at(CHECKOUT_TICKET.freeFcfs)).toBeNull();
  });

  // #804 `V2MyOrderAccountResponse`·`V2MyRefundAccountResponse` — bankCode는 서버 추정, 실패면 null
  it.each([
    ['은행 코드 추정 성공', '088', '088'],
    ['자유 입력 은행명이라 추정 실패 → null', null, null],
  ])('계좌 bankCode: %s', (_, bankCode, expected) => {
    const account = { ...test45BankOrder.payment.account, bankCode };
    const parsed = MyOrderDetailSchema.parse({
      ...test45BankOrder,
      payment: { ...test45BankOrder.payment, account },
      refundAccount: {
        bankName: '신한은행',
        bankCode,
        accountHolder: '홍길동',
        maskedAccountNumber: '******6789',
      },
    });
    expect(parsed.payment?.account?.bankCode).toBe(expected);
    expect(parsed.refundAccount?.bankCode).toBe(expected);
  });

  it('계좌에 bankCode 키가 없으면(#804 전 서버) 계약 위반으로 실패', () => {
    const noCode = {
      bankName: '신한은행',
      accountHolder: '고스락',
      accountNumber: '110-123-456789',
    };
    expect(
      CheckoutSchema.safeParse({
        ticket: toCheckout(
          findCheckoutTicket(CHECKOUT_EVENT_ID, CHECKOUT_TICKET.paidNoOptions).ticket!,
        ).ticket,
        account: noCode,
      }).success,
    ).toBe(false);
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
    ['동의 필드 없이 agreementVersion만', { agreementVersion: '2026-10' }],
    ['동의 필드가 있는데 agreementVersion 없음', { hostProvisionAgreed: true }],
    [
      '동의 필드 false(true일 때만 보낸다)',
      { hostProvisionAgreed: false, agreementVersion: '2026-10' },
    ],
    ['agreementVersion 51자', { hostProvisionAgreed: true, agreementVersion: 'v'.repeat(51) }],
  ])('%s → 실패', (_, patch) => {
    expect(CreateOrderRequestSchema.safeParse({ ...base, ...patch }).success).toBe(false);
  });

  // #840 동의 필드(선택) — 사용자가 체크한 것만 true로, 하나라도 있으면 agreementVersion을 같이
  it.each([
    ['동의 필드 없음(지금 화면 — Q42)', {}],
    ['호스트 제공 동의 + 버전', { hostProvisionAgreed: true, agreementVersion: '2026-10' }],
    [
      '두둥: 호스트 제공 동의 + 고지 확인 + 버전',
      {
        hostProvisionAgreed: true,
        dudoongTicketNoticeConfirmed: true,
        agreementVersion: '2026-10',
      },
    ],
  ])('%s → 통과', (_, patch) => {
    expect(CreateOrderRequestSchema.safeParse({ ...base, ...patch }).success).toBe(true);
  });
});

// ─── P9 — G11/O-2 목록 · O-4·O-5 요청(`V2MyOrderElement`·`V2RefundAccountRequest`·`V2CancelMyOrderRequest` @432cce4) ───

describe('P9 주문 스키마', () => {
  it.each(Object.entries(p9SeededOrders))('O-3 P9 mock 주문(%s)', (_, order) => {
    expect(MyOrderDetailSchema.parse(order)).toEqual(order);
  });

  it('O-2 목록 항목 — 삭제된 공연은 event null, 무료는 totalAmount 0', () => {
    const row = {
      orderUuid: 'u1',
      orderNo: 'R1',
      event: null,
      ticketName: '무료',
      quantity: 1,
      totalAmount: 0,
      status: 'CANCELED',
      refundStatus: 'NONE',
      orderedAt: '2026.10.17 20:00',
    };
    const page = {
      content: [row],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
    };
    expect(MyOrderPageSchema.parse(page)).toEqual(page);
  });

  const account = { bankCode: '088', accountHolder: '홍길동', accountNumber: '110-123-456789' };
  it.each<[string, Record<string, unknown>, boolean]>([
    ['정상', account, true],
    [
      'bankCode 없음(프론트는 언제나 목록 코드를 보낸다)',
      { ...account, bankCode: undefined },
      false,
    ],
    ['bankName을 같이 보냄(엄격 — 보내지 않는다)', { ...account, bankName: '신한은행' }, false],
    ['코드 형식(3자리 숫자) 아님', { ...account, bankCode: '88' }, false],
    ['예금주 20자', { ...account, accountHolder: '가'.repeat(20) }, true],
    ['예금주 21자', { ...account, accountHolder: '가'.repeat(21) }, false],
    ['예금주 공백만', { ...account, accountHolder: '  ' }, false],
    ['계좌번호 30자', { ...account, accountNumber: '1'.repeat(30) }, true],
    ['계좌번호 31자', { ...account, accountNumber: '1'.repeat(31) }, false],
    ['계좌번호 공백 허용', { ...account, accountNumber: '110 123 456' }, true],
    ['계좌번호 하이픈으로 시작', { ...account, accountNumber: '-110' }, false],
  ])('환불 계좌 본문: %s → %s', (_, body, ok) => {
    expect(RefundAccountRequestSchema.safeParse(body).success).toBe(ok);
  });

  it('취소 본문은 { refundAccount }만(유료). 무료는 본문 없이 보낸다', () => {
    expect(CancelMyOrderRequestSchema.safeParse({ refundAccount: account }).success).toBe(true);
    expect(CancelMyOrderRequestSchema.safeParse({}).success).toBe(false);
  });
});
