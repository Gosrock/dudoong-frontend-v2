import { describe, expect, it } from 'vitest';

import { seededOrders } from '@/api/__mocks__/fixtures/order';
import { ORDER_ERROR_REASONS } from '@/api/__mocks__/order.handlers';

import {
  CHECKOUT_ERROR_TABLE,
  type CheckoutErrorKind,
  classifyCheckoutError,
} from './checkout-errors';
import { checkoutHref, eventHref, parseCheckoutParams } from './checkout-params';
import { isCreatedParam, orderCreatedHref, orderResultKind } from './order-result';
import {
  checkoutKind,
  ctaLabel,
  needsDepositConfirm,
  selectablePaymentChannels,
  tossTransferLink,
} from './payment';

const account = {
  bankName: '신한은행',
  bankCode: '088',
  accountHolder: '고스락',
  accountNumber: '110-123-456789',
};

describe('3분기 · CTA', () => {
  it.each([
    ['두둥', { payType: 'DUDOONG', approvalRequired: true }, 'TRANSFER', '결제하기', true],
    [
      '무료 승인형',
      { payType: 'FREE', approvalRequired: true },
      'FREE_APPROVAL',
      '신청하기',
      false,
    ],
    ['무료 선착순', { payType: 'FREE', approvalRequired: false }, 'FREE_FCFS', '신청하기', false],
  ] as const)('%s → %s · %s · 입금 확인 %s', (_, ticket, kind, label, confirm) => {
    expect(checkoutKind(ticket)).toBe(kind);
    expect(ctaLabel(kind)).toBe(label);
    expect(needsDepositConfirm(kind)).toBe(confirm);
  });

  it.each([
    ['PG', 'PRICE'],
    ['모름', 'UNKNOWN'],
    ['없음', null],
  ] as const)('%s 결제 방식은 주문 불가(null)', (_, payType) => {
    expect(checkoutKind({ payType, approvalRequired: true })).toBeNull();
  });

  it('결제 방식 선택은 입금형만', () => {
    expect(selectablePaymentChannels('TRANSFER')).toEqual(['BANK_TRANSFER', 'TOSS_TRANSFER']);
    expect(selectablePaymentChannels('FREE_FCFS')).toEqual([]);
  });
});

describe('토스 송금 링크', () => {
  it('금액 = 총액, 계좌번호는 숫자만, 은행명은 계좌 값 그대로(B3 미정)', () => {
    const link = tossTransferLink(account, 50_000)!;
    expect(link.startsWith('supertoss://send?')).toBe(true);
    const q = new URL(link.replace('supertoss://send', 'https://x.test/send')).searchParams;
    expect(Object.fromEntries(q)).toEqual({
      bank: '신한은행',
      accountNo: '110123456789',
      amount: '50000',
    });
  });

  it.each([
    ['088(추정 성공)', '088'],
    ['null(자유 입력이라 추정 실패)', null],
  ])(
    'bankCode가 %s여도 은행 값은 아직 bankName — 토스 매핑은 근거가 없어 미정(B3, #804)',
    (_, bankCode) => {
      const link = tossTransferLink({ ...account, bankCode }, 1000)!;
      const q = new URL(link.replace('supertoss://send', 'https://x.test/send')).searchParams;
      expect(q.get('bank')).toBe('신한은행');
    },
  );

  it.each([
    ['금액 0(무료)', account, 0],
    ['금액이 정수가 아님', account, 1.5],
    ['계좌 없음', null, 1000],
    ['은행명 없음', { ...account, bankName: null }, 1000],
    ['예금주 공백', { ...account, accountHolder: ' ' }, 1000],
    ['계좌번호에 숫자가 없음', { ...account, accountNumber: '---' }, 1000],
  ])('%s → 링크 없음', (_, acc, amount) => {
    expect(tossTransferLink(acc, amount)).toBeNull();
  });
});

describe('주소 — 선택 → 체크아웃 → 완료', () => {
  it('체크아웃 주소를 만들고 같은 값으로 읽는다', () => {
    const href = checkoutHref(101, { ticketItemId: 501, quantity: 2 });
    expect(href).toBe('/events/101/checkout?ticketItemId=501&quantity=2');
    expect(parseCheckoutParams(new URL(href, 'https://x.test').searchParams)).toEqual({
      ticketItemId: 501,
      quantity: 2,
    });
    expect(eventHref(101)).toBe('/events/101');
  });

  it.each([
    ['없음', {}],
    ['수량 0', { ticketItemId: '501', quantity: '0' }],
    ['수량 101', { ticketItemId: '501', quantity: '101' }],
    ['소수', { ticketItemId: '501', quantity: '1.5' }],
    ['음수', { ticketItemId: '-1', quantity: '1' }],
    ['문자', { ticketItemId: 'abc', quantity: '1' }],
  ])('틀린 주소(%s) → null', (_, params) => {
    expect(parseCheckoutParams(params)).toBeNull();
  });

  it('수량 1·100은 받는다, 배열 값은 첫 값', () => {
    expect(parseCheckoutParams({ ticketItemId: '1', quantity: '1' })).toEqual({
      ticketItemId: 1,
      quantity: 1,
    });
    expect(parseCheckoutParams({ ticketItemId: ['7', '8'], quantity: '100' })).toEqual({
      ticketItemId: 7,
      quantity: 100,
    });
  });

  it('완료 주소와 created 판정', () => {
    expect(orderCreatedHref('abc')).toBe('/orders/abc?created=1');
    expect(isCreatedParam('1')).toBe(true);
    expect(isCreatedParam(['1'])).toBe(true);
    expect(isCreatedParam(undefined)).toBe(false);
    expect(isCreatedParam('true')).toBe(false);
  });

  it('완료 안내 3분기', () => {
    expect(orderResultKind(seededOrders.transfer)).toBe('AWAITING_DEPOSIT_APPROVAL');
    expect(orderResultKind(seededOrders.freeApproval)).toBe('AWAITING_APPROVAL');
    expect(orderResultKind(seededOrders.freeFcfs)).toBe('ISSUED');
    expect(orderResultKind({ status: 'REFUSED', payment: null })).toBe('OTHER');
    expect(orderResultKind({ status: 'UNKNOWN', payment: null })).toBe('OTHER');
  });
});

describe('주문 생성 에러 분기 — patterns §24 P7 행', () => {
  it.each<[string, CheckoutErrorKind, boolean, 'event' | 'orders' | null]>([
    ['Event_400_5', 'EVENT_CLOSED', false, 'event'],
    ['Event_400_6', 'EVENT_CLOSED', false, 'event'],
    ['Order_400_15', 'PENDING_LIMIT', true, null],
    ['Ticket_Item_400_6', 'PURCHASE_LIMIT', true, null],
    ['Ticket_Item_400_1', 'STOCK', true, null],
    ['Ticket_Item_400_10', 'NOT_ON_SALE', true, 'event'],
    ['Ticket_Item_404_1', 'NOT_ON_SALE', true, 'event'],
    ['Event_404_1', 'NOT_ON_SALE', false, 'event'],
    ['Order_400_22', 'DEPOSITOR_NAME', false, null],
    ['Order_400_23', 'OPTION_ANSWERS', false, null],
    ['Order_400_26', 'DUPLICATE_IN_PROGRESS', false, 'orders'],
  ])('%s → %s, GP-5 다시 읽기 %s, 이동 %s', (code, kind, refetch, navigate) => {
    expect(classifyCheckoutError(code)).toMatchObject({ kind, refetchTickets: refetch, navigate });
  });

  it('입금자명 오류는 프로필 닉네임 확인 안내', () => {
    expect(CHECKOUT_ERROR_TABLE.Order_400_22.message).toContain(
      '프로필에서 닉네임을 확인해 주세요',
    );
  });

  it.each(['Order_400_21', 'Order_400_20', 'GLOBAL_400_1', 'GLOBAL_500_1', 'NETWORK'])(
    '표에 없는 %s는 전역 토스트(reason)로',
    (code) => {
      expect(classifyCheckoutError(code)).toBeNull();
    },
  );

  it('표의 코드는 mock이 낼 수 있는 실제 코드다(error-codes.md)', () => {
    for (const code of Object.keys(CHECKOUT_ERROR_TABLE)) {
      expect(ORDER_ERROR_REASONS).toHaveProperty(code);
    }
    expect(classifyCheckoutError(null)).toBeNull();
    expect(classifyCheckoutError('toString')).toBeNull();
  });
});
