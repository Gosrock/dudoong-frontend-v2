import { describe, expect, it } from 'vitest';

import {
  MAX_ORDER_QUANTITY,
  maxOrderQuantity,
  optionAdditionalPrice,
  orderTotalAmount,
} from './price';

const yes = (additionalPrice: number) => ({ additionalPrice });

describe('orderTotalAmount — 모든 티켓 동일', () => {
  it('단가 × 수량', () => {
    expect(
      orderTotalAmount({ price: 15000, quantity: 3, options: { applyToAll: true, answers: [] } }),
    ).toBe(45000);
  });

  it('옵션 추가금도 수량만큼 곱한다(백엔드 (price + Σ옵션) × quantity)', () => {
    expect(
      orderTotalAmount({
        price: 10000,
        quantity: 3,
        options: { applyToAll: true, answers: [yes(2000), yes(0), yes(500)] },
      }),
    ).toBe((10000 + 2500) * 3);
  });

  it('무료 티켓은 0원', () => {
    expect(
      orderTotalAmount({ price: 0, quantity: 5, options: { applyToAll: true, answers: [yes(0)] } }),
    ).toBe(0);
  });
});

describe('orderTotalAmount — 티켓별', () => {
  it('티켓마다 (단가 + 그 티켓의 옵션 추가금)을 더한다', () => {
    expect(
      orderTotalAmount({
        price: 10000,
        quantity: 3,
        options: { applyToAll: false, perTicket: [[yes(2000)], [yes(0)], [yes(2000), yes(1000)]] },
      }),
    ).toBe(30000 + 2000 + 3000);
  });

  it('답 묶음이 수량보다 적으면(폼 갱신 중) 빈 답, 많으면 수량까지만', () => {
    expect(
      orderTotalAmount({
        price: 100,
        quantity: 3,
        options: { applyToAll: false, perTicket: [[yes(10)]] },
      }),
    ).toBe(310);
    expect(
      orderTotalAmount({
        price: 100,
        quantity: 1,
        options: { applyToAll: false, perTicket: [[yes(10)], [yes(999)]] },
      }),
    ).toBe(110);
  });
});

describe('orderTotalAmount — 경계값', () => {
  const none = { applyToAll: true, answers: [] } as const;

  it('수량 1과 100은 받고 0·101·소수는 RangeError', () => {
    expect(orderTotalAmount({ price: 1, quantity: 1, options: none })).toBe(1);
    expect(orderTotalAmount({ price: 1, quantity: MAX_ORDER_QUANTITY, options: none })).toBe(100);
    for (const quantity of [0, -1, 101, 1.5, Number.NaN]) {
      expect(() => orderTotalAmount({ price: 1, quantity, options: none })).toThrow(RangeError);
    }
  });

  it('음수·소수·NaN 금액은 RangeError', () => {
    expect(() => orderTotalAmount({ price: -1, quantity: 1, options: none })).toThrow(RangeError);
    expect(() => orderTotalAmount({ price: 0.5, quantity: 1, options: none })).toThrow(RangeError);
    expect(() =>
      orderTotalAmount({
        price: 1,
        quantity: 1,
        options: { applyToAll: true, answers: [yes(Number.NaN)] },
      }),
    ).toThrow(RangeError);
  });

  it('백엔드 상한(티켓·옵션 1,000만 원, 옵션 50개, 수량 100)에서도 안전한 정수', () => {
    const max = 10_000_000;
    const answers = Array.from({ length: 50 }, () => yes(max));
    const all = orderTotalAmount({
      price: max,
      quantity: 100,
      options: { applyToAll: true, answers },
    });
    expect(all).toBe(51 * max * 100);
    expect(Number.isSafeInteger(all)).toBe(true);
    const perTicket = orderTotalAmount({
      price: max,
      quantity: 100,
      options: { applyToAll: false, perTicket: Array.from({ length: 100 }, () => answers) },
    });
    expect(perTicket).toBe(all);
  });

  it('합이 안전한 정수를 넘으면 RangeError', () => {
    expect(() =>
      orderTotalAmount({ price: Number.MAX_SAFE_INTEGER, quantity: 2, options: none }),
    ).toThrow(RangeError);
  });
});

describe('optionAdditionalPrice', () => {
  it('YES일 때만 yesAdditionalPrice', () => {
    expect(optionAdditionalPrice(3000, 'YES')).toBe(3000);
    expect(optionAdditionalPrice(3000, 'NO')).toBe(0);
    expect(optionAdditionalPrice(3000, undefined)).toBe(0);
    expect(optionAdditionalPrice(null, 'YES')).toBe(0);
    expect(optionAdditionalPrice(null, '주관식 답')).toBe(0);
  });
});

describe('maxOrderQuantity', () => {
  it('purchaseLimit · remaining · 100 중 가장 작은 값(null 제외)', () => {
    expect(maxOrderQuantity({ purchaseLimit: null, remaining: null })).toBe(100);
    expect(maxOrderQuantity({ purchaseLimit: 4, remaining: null })).toBe(4);
    expect(maxOrderQuantity({ purchaseLimit: null, remaining: 2 })).toBe(2);
    expect(maxOrderQuantity({ purchaseLimit: 500, remaining: 300 })).toBe(100);
    expect(maxOrderQuantity({ purchaseLimit: 5, remaining: 0 })).toBe(0);
    expect(maxOrderQuantity({ purchaseLimit: 5, remaining: -3 })).toBe(0);
  });
});
