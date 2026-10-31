import { describe, expect, it } from 'vitest';

import { MOCK_MY_REFUND_ACCOUNT, P9_ORDER, p9SeededOrders } from '@/api/__mocks__/fixtures/order';
import {
  MY_ORDER_STATUSES,
  type MyOrderDetail,
  type MyOrderStatus,
  REFUND_STATUSES,
  RefundAccountRequestSchema,
  type RefundStatus,
} from '@/api/order/schema';

import { archiveOrderHref, archiveYearTabs, FOLLOWING_TABS, representativeBadge } from './lists';
import {
  cancelEntry,
  cancelNotice,
  cancelResult,
  GIFT_BLOCKS_CANCEL_MESSAGE,
  giftBlocksCancel,
  isPaidOrder,
  optionMode,
  orderAmounts,
  refundAccountEntry,
  refuseReasonText,
} from './order-detail';
import {
  CANCEL_ERROR_TABLE,
  messageAfterCancelBlocked,
  NOT_CANCELABLE_MESSAGE,
  REFUND_ACCOUNT_ERROR_TABLE,
} from './order-errors';
import { orderStatusView } from './order-status';
import { nicknameError } from './profile';
import {
  refundAccountDefaults,
  refundAccountErrors,
  toRefundAccountBody,
} from './refund-account-form';

const order = (uuid: string) => p9SeededOrders[uuid]!;

describe('주문 상태 5종 × refundStatus → 표시(목록·상세 공용 매핑 하나)', () => {
  it.each<[MyOrderStatus | null, RefundStatus, string, string | null]>([
    ['PENDING_APPROVE', 'NONE', '승인대기', null],
    ['APPROVED', 'NONE', '승인완료', null],
    ['REFUSED', 'NONE', '승인거절', null],
    ['REFUSED', 'REQUESTED', '승인거절', '환불 대기'],
    ['REFUSED', 'COMPLETED', '승인거절', '환불 완료'],
    ['CANCELED', 'NONE', '주문취소완료', null],
    ['CANCELED', 'REQUESTED', '주문취소완료', '환불 대기'],
    ['CANCELED', 'COMPLETED', '주문취소완료', '환불 완료'],
    ['REFUNDED', 'REQUESTED', '환불요청', null],
    ['REFUNDED', 'COMPLETED', '환불완료', null],
    ['REFUNDED', 'NONE', '주문취소완료', null],
    ['REFUNDED', 'UNKNOWN', '환불 상태 확인 필요', null],
    ['UNKNOWN', 'NONE', '상태 확인 필요', null],
    [null, 'NONE', '상태 확인 필요', null],
    ['APPROVED', 'UNKNOWN', '승인완료', '환불 상태 확인 필요'],
  ])('%s + %s → %s (%s)', (status, refund, label, refundLabel) => {
    expect(orderStatusView(status, refund)).toMatchObject({ label, refund: refundLabel });
  });

  it('서버 enum 5종 × 3종 + UNKNOWN 조합이 모두 라벨을 갖는다', () => {
    for (const s of [...MY_ORDER_STATUSES, 'UNKNOWN', null] as const) {
      for (const r of [...REFUND_STATUSES, 'UNKNOWN'] as const) {
        expect(orderStatusView(s, r).label).toBeTruthy();
      }
    }
  });
});

describe('주문취소 자리 — canCancel · 선물 안내 조건(patterns §20)', () => {
  it.each<[string, string, ReturnType<typeof cancelEntry>['kind']]>([
    ['취소 가능(두둥 승인 완료)', P9_ORDER.approvedPaid, 'cancel'],
    ['선물 대기 티켓', P9_ORDER.giftPending, 'giftNotice'],
    ['선물 완료(SENT) 티켓', P9_ORDER.giftSent, 'giftNotice'],
    ['입장 티켓 + 선물 대기 → 안내 없음', P9_ORDER.enteredWithGift, 'none'],
    ['공연 시작 뒤(PAST) + 선물 대기 → 안내 없음', P9_ORDER.pastWithGift, 'none'],
    ['호스트 취소 주문 → 안내 없음', P9_ORDER.hostCanceled, 'none'],
    ['거절 주문 → 없음', P9_ORDER.refusedAmount, 'none'],
    ['삭제된 공연(event null) → 없음', P9_ORDER.deletedEvent, 'none'],
  ])('%s → %s', (_, uuid, kind) => {
    expect(cancelEntry(order(uuid)).kind).toBe(kind);
  });

  it('선물 안내 문구', () => {
    expect(cancelEntry(order(P9_ORDER.giftPending))).toEqual({
      kind: 'giftNotice',
      message: GIFT_BLOCKS_CANCEL_MESSAGE,
    });
  });

  it('유료 취소는 환불 계좌가 필요하고, 무료는 필요 없다', () => {
    expect(cancelEntry(order(P9_ORDER.approvedPaid))).toEqual({
      kind: 'cancel',
      refundAccount: true,
    });
    const free = { ...order(P9_ORDER.approvedPaid), payment: null };
    expect(cancelEntry(free)).toEqual({ kind: 'cancel', refundAccount: false });
    expect(isPaidOrder({ payment: null })).toBe(false);
  });

  const giftBase = order(P9_ORDER.giftPending);
  const withEvent = (displayStatus: string): MyOrderDetail => ({
    ...giftBase,
    event: { ...giftBase.event!, displayStatus: displayStatus as never },
  });
  it.each<[string, MyOrderDetail, boolean]>([
    ['조건 모두 맞음', giftBase, true],
    ['canCancel=true면 안내 대신 버튼', { ...giftBase, canCancel: true }, false],
    ['승인 대기', { ...giftBase, status: 'PENDING_APPROVE' }, false],
    ['공연 중(ONGOING)', withEvent('ONGOING'), false],
    ['지난 공연(PAST)', withEvent('PAST'), false],
    ['모르는 공연 상태(UNKNOWN)', withEvent('UNKNOWN'), false],
    ['삭제된 공연(event null) — 판정 전에 거른다', { ...giftBase, event: null }, false],
    [
      '선물 티켓이 취소된 티켓(entrance CANCELED)뿐',
      {
        ...giftBase,
        issuedTickets: giftBase.issuedTickets.map((t) => ({ ...t, entrance: 'CANCELED' as const })),
      },
      false,
    ],
    [
      '선물 상태가 RECEIVED·UNKNOWN뿐',
      {
        ...giftBase,
        issuedTickets: giftBase.issuedTickets.map((t) => ({
          ...t,
          giftState: 'UNKNOWN' as const,
        })),
      },
      false,
    ],
  ])('giftBlocksCancel: %s → %s', (_, o, expected) => {
    expect(giftBlocksCancel(o)).toBe(expected);
  });
});

describe('환불 계좌 입구 — canEditRefundAccount · 유도 refundAccountRequired', () => {
  it.each<[string, string, ReturnType<typeof refundAccountEntry>]>([
    [
      '유료 거절(결제 금액 오류) → 입력 + 유도',
      P9_ORDER.refusedAmount,
      { kind: 'open', mode: 'input', prompt: true },
    ],
    [
      '입금 미확인 거절 → 입구만(유도 없음)',
      P9_ORDER.refusedDeposit,
      { kind: 'open', mode: 'input', prompt: false },
    ],
    [
      '호스트 취소 → 입력 + 유도',
      P9_ORDER.hostCanceled,
      { kind: 'open', mode: 'input', prompt: true },
    ],
    [
      '사용자 취소 환불 요청(계좌 있음) → 수정',
      P9_ORDER.refundRequested,
      { kind: 'open', mode: 'edit', prompt: false },
    ],
    ['환불 완료 → 없음', P9_ORDER.refundCompleted, { kind: 'none' }],
    ['무료 거절 → 없음', P9_ORDER.refusedFree, { kind: 'none' }],
    ['승인 완료 → 없음', P9_ORDER.approvedPaid, { kind: 'none' }],
  ])('%s', (_, uuid, expected) => {
    expect(refundAccountEntry(order(uuid))).toEqual(expected);
  });
});

describe('거절 사유 · 금액 · 옵션 · 안내 종류', () => {
  it.each<[string, Partial<MyOrderDetail>, string | null]>([
    ['입금 미확인', { refuseReasonType: 'DEPOSIT_UNCONFIRMED' }, '입금 미확인'],
    ['결제 금액 오류', { refuseReasonType: 'AMOUNT_MISMATCH' }, '결제 금액 오류'],
    ['티켓 매진', { refuseReasonType: 'SOLD_OUT' }, '티켓 매진'],
    [
      'ETC — 호스트 문구',
      { refuseReasonType: 'ETC', refuseReason: '공연 일정 변경' },
      '공연 일정 변경',
    ],
    ['ETC — 문구 없음', { refuseReasonType: 'ETC', refuseReason: null }, '기타'],
    ['모르는 사유 — 서버 문구', { refuseReasonType: 'UNKNOWN', refuseReason: '사유' }, '사유'],
    ['v1 거절(종류 없음, 문구 없음)', { refuseReasonType: null, refuseReason: null }, null],
    ['거절이 아니면 없음', { status: 'CANCELED', refuseReasonType: 'SOLD_OUT' }, null],
  ])('%s', (_, patch, expected) => {
    expect(refuseReasonText({ status: 'REFUSED', refuseReason: null, ...patch } as never)).toBe(
      expected,
    );
  });

  it('금액은 티켓·옵션·총액만(할인 없음 — Q12), 무료는 null', () => {
    const paid = order(P9_ORDER.refusedAmount);
    expect(orderAmounts(paid)).toEqual({
      ticketAmount: paid.payment!.ticketAmount,
      optionAmount: paid.payment!.optionAmount,
      totalAmount: paid.payment!.totalAmount,
    });
    expect(orderAmounts({ payment: null })).toBeNull();
  });

  it.each<[string, MyOrderDetail['lines'], ReturnType<typeof optionMode>]>([
    [
      '줄 1개 + 답 → 모든 티켓 같은 옵션',
      [
        {
          quantity: 2,
          linePrice: 0,
          optionAnswers: [{ optionName: 'a', description: null, answer: '예', additionalPrice: 0 }],
        },
      ],
      'all',
    ],
    [
      '줄 여러 개 → 티켓별',
      [1, 2].map(() => ({
        quantity: 1,
        linePrice: 0,
        optionAnswers: [{ optionName: 'a', description: null, answer: 'x', additionalPrice: 0 }],
      })),
      'perTicket',
    ],
    ['답 없음', [{ quantity: 2, linePrice: 0, optionAnswers: [] }], 'none'],
    ['줄 없음', [], 'none'],
  ])('옵션 표시: %s', (_, lines, expected) => {
    expect(optionMode({ lines })).toBe(expected);
  });

  it.each<[string, Pick<MyOrderDetail, 'ticket' | 'status'>, ReturnType<typeof cancelNotice>]>([
    [
      '두둥 승인 대기 → ⑤-b(B18 위험)',
      {
        ticket: { ...order(P9_ORDER.approvedPaid).ticket, payType: 'DUDOONG' },
        status: 'PENDING_APPROVE',
      },
      { kind: 'DUDOONG', pendingApproval: true },
    ],
    [
      '두둥 승인 완료',
      {
        ticket: { ...order(P9_ORDER.approvedPaid).ticket, payType: 'DUDOONG' },
        status: 'APPROVED',
      },
      { kind: 'DUDOONG', pendingApproval: false },
    ],
    [
      '무료',
      {
        ticket: { ...order(P9_ORDER.approvedPaid).ticket, payType: 'FREE' },
        status: 'PENDING_APPROVE',
      },
      { kind: 'FREE', pendingApproval: false },
    ],
    [
      'v1 PG(PRICE) → 없음',
      { ticket: { ...order(P9_ORDER.approvedPaid).ticket, payType: 'PRICE' }, status: 'APPROVED' },
      null,
    ],
    [
      'payType null → 없음',
      { ticket: { ...order(P9_ORDER.approvedPaid).ticket, payType: null }, status: 'APPROVED' },
      null,
    ],
  ])('약관 안내 종류: %s', (_, o, expected) => {
    expect(cancelNotice(o)).toEqual(expected);
  });

  it.each<[MyOrderStatus, RefundStatus, ReturnType<typeof cancelResult>]>([
    ['REFUNDED', 'REQUESTED', 'refundRequested'],
    ['CANCELED', 'NONE', 'canceled'],
    ['APPROVED', 'NONE', 'unknown'],
  ])('취소 결과: %s + %s → %s', (status, refundStatus, expected) => {
    expect(cancelResult({ status, refundStatus })).toBe(expected);
  });
});

describe('환불 계좌 폼 — 은행 코드 · 예금주 20자 · 계좌번호 30자(숫자·하이픈·공백)', () => {
  const valid = { bankCode: '088', accountHolder: '두둥이', accountNumber: '110-123-456789' };
  it.each<[string, Partial<typeof valid>, Partial<Record<keyof typeof valid, string>>]>([
    ['정상', {}, {}],
    ['은행 미선택', { bankCode: '' }, { bankCode: '은행을 골라 주세요' }],
    ['목록에 없는 은행 코드', { bankCode: '999' }, { bankCode: '은행을 골라 주세요' }],
    ['예금주 공백만', { accountHolder: '   ' }, { accountHolder: '예금주를 입력해 주세요' }],
    ['예금주 20자', { accountHolder: '가'.repeat(20) }, {}],
    [
      '예금주 21자',
      { accountHolder: '가'.repeat(21) },
      { accountHolder: '예금주는 20자까지 입력할 수 있어요' },
    ],
    ['계좌번호 없음', { accountNumber: ' ' }, { accountNumber: '계좌번호를 입력해 주세요' }],
    ['계좌번호 30자', { accountNumber: '1'.repeat(30) }, {}],
    [
      '계좌번호 31자',
      { accountNumber: '1'.repeat(31) },
      { accountNumber: '계좌번호는 30자까지 입력할 수 있어요' },
    ],
    ['공백 포함', { accountNumber: '110 123 456789' }, {}],
    [
      '문자 포함',
      { accountNumber: '110-abc-4567' },
      { accountNumber: '계좌번호는 숫자와 하이픈만 입력해 주세요' },
    ],
    [
      '하이픈으로 끝남',
      { accountNumber: '110-123-' },
      { accountNumber: '계좌번호는 숫자와 하이픈만 입력해 주세요' },
    ],
    [
      '한 자리',
      { accountNumber: '1' },
      { accountNumber: '계좌번호는 숫자와 하이픈만 입력해 주세요' },
    ],
  ])('%s', (_, patch, expected) => {
    expect(refundAccountErrors({ ...valid, ...patch }, ['088', '004'])).toEqual(expected);
  });

  it('보내는 본문: 앞뒤 공백을 지우고 bankCode만(bankName 없음), 요청 스키마를 통과한다', () => {
    const r = toRefundAccountBody({
      bankCode: '004',
      accountHolder: ' 두둥이 ',
      accountNumber: ' 123-45 ',
    });
    expect(r).toEqual({
      ok: true,
      body: { bankCode: '004', accountHolder: '두둥이', accountNumber: '123-45' },
    });
    expect(RefundAccountRequestSchema.safeParse(r.ok && r.body).success).toBe(true);
  });

  it('은행 목록을 아직 못 받았으면 코드 대조를 건너뛴다(서버가 막는다)', () => {
    expect(refundAccountErrors({ ...valid, bankCode: '999' })).toEqual({});
  });

  it('처음 값 — 계좌번호는 비우고, bankCode가 null인 옛 계좌는 은행도 비운다', () => {
    expect(refundAccountDefaults(null)).toEqual({
      bankCode: '',
      accountHolder: '',
      accountNumber: '',
    });
    expect(refundAccountDefaults(MOCK_MY_REFUND_ACCOUNT)).toEqual({
      bankCode: '088',
      accountHolder: '두둥이',
      accountNumber: '',
    });
    expect(refundAccountDefaults(order(P9_ORDER.refundRequestedLegacyBank).refundAccount)).toEqual({
      bankCode: '',
      accountHolder: '두둥이',
      accountNumber: '',
    });
  });
});

describe('에러 분기 — patterns §24 P9 행', () => {
  it.each([
    ['Order_400_5', true, '이미 취소되었거나 취소할 수 없는 주문이에요'],
    ['Order_400_24', true, null],
    ['Event_400_5', true, '지금은 취소할 수 없는 공연이에요'],
    ['Order_400_9', true, '공연이 시작되어 취소할 수 없어요'],
    ['Order_400_25', false, '환불받을 계좌를 입력해 주세요'],
  ] as const)('취소 %s → 다시 읽기 %s, 안내 %s', (code, refetch, message) => {
    expect(CANCEL_ERROR_TABLE[code]).toMatchObject({ refetch, message });
  });
  it('취소 Order_400_25는 계좌 시트를 연다는 신호', () => {
    expect(CANCEL_ERROR_TABLE.Order_400_25.refundAccountMissing).toBe(true);
  });
  it.each([
    ['Order_400_27', true, '환불 계좌를 입력할 수 없는 주문이에요'],
    ['Order_400_28', true, '이미 환불이 완료된 주문이에요'],
    ['Order_400_25', false, '환불받을 계좌를 다시 확인해 주세요'],
  ] as const)('환불 계좌 %s → 다시 읽기 %s, 안내 %s', (code, refetch, message) => {
    expect(REFUND_ACCOUNT_ERROR_TABLE[code]).toMatchObject({ refetch, message });
  });
  it('Order_400_24 뒤 다시 읽은 주문이 선물 조건이면 선물 안내, 아니면 일반 안내', () => {
    expect(messageAfterCancelBlocked(order(P9_ORDER.giftPending))).toBe(GIFT_BLOCKS_CANCEL_MESSAGE);
    expect(messageAfterCancelBlocked(order(P9_ORDER.enteredWithGift))).toBe(NOT_CANCELABLE_MESSAGE);
    expect(messageAfterCancelBlocked(undefined)).toBe(NOT_CANCELABLE_MESSAGE);
  });
});

describe('닉네임 2~7자', () => {
  it.each<[string, string | null]>([
    ['', '닉네임을 입력해 주세요'],
    ['   ', '닉네임을 입력해 주세요'],
    ['가', '닉네임은 2~7자로 입력해 주세요'],
    ['가나', null],
    [' 가나 ', null],
    ['가나다라마바사', null],
    ['가나다라마바사아', '닉네임은 2~7자로 입력해 주세요'],
  ])('%j → %s', (name, expected) => {
    expect(nicknameError(name)).toBe(expected);
  });
});

describe('관심 호스트 · 아카이빙', () => {
  it('필터 탭은 서버 status 3값', () => {
    expect(FOLLOWING_TABS.map((t) => t.status)).toEqual(['ALL', 'ACTIVE', 'ENDED']);
  });

  const rep = { eventId: 1, name: null, posterImageUrl: null, startAt: null, endAt: null };
  it.each<[string, Parameters<typeof representativeBadge>[0], string | null]>([
    ['대표 공연 없음', null, null],
    ['D-7', { ...rep, displayStatus: 'UPCOMING', dDay: 7 }, 'D-7'],
    ['당일', { ...rep, displayStatus: 'UPCOMING', dDay: 0 }, 'D-DAY'],
    ['UPCOMING인데 dDay null', { ...rep, displayStatus: 'UPCOMING', dDay: null }, null],
    ['공연 중', { ...rep, displayStatus: 'ONGOING', dDay: null }, '공연 중'],
    ['공연 종료', { ...rep, displayStatus: 'PAST', dDay: null }, '공연 종료'],
    ['모르는 상태', { ...rep, displayStatus: 'UNKNOWN', dDay: null }, null],
  ])('대표 공연 배지: %s', (_, event, expected) => {
    expect(representativeBadge(event)).toBe(expected);
  });

  it('아카이빙 orderUuid=null이면 주문상세 주소가 없다', () => {
    expect(archiveOrderHref({ orderUuid: null })).toBeNull();
    expect(archiveOrderHref({ orderUuid: 'a b' })).toBe('/orders/a%20b');
  });

  it('연도 탭: 전체 + 서버 years 순서 그대로', () => {
    expect(archiveYearTabs([2026, 2025])).toEqual([
      { year: null, label: '전체' },
      { year: 2026, label: '2026' },
      { year: 2025, label: '2025' },
    ]);
  });
});
