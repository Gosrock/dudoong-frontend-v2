import { describe, expect, it } from 'vitest';

import { clampCount, counterBounds } from './stepCount';

describe('clampCount', () => {
  it('범위 안의 값은 그대로', () => expect(clampCount(3, 0, 5)).toBe(3));
  it('아래로 넘으면 min', () => expect(clampCount(-1, 0, 5)).toBe(0));
  it('위로 넘으면 max', () => expect(clampCount(9, 1, 5)).toBe(5));
  it('NaN은 min', () => expect(clampCount(Number.NaN, 1, 5)).toBe(1));
});

describe('counterBounds', () => {
  it('min에서는 줄일 수 없다', () =>
    expect(counterBounds(1, 1, 3, 1)).toEqual({ canDecrease: false, canIncrease: true }));
  it('max에서는 늘릴 수 없다', () =>
    expect(counterBounds(3, 1, 3, 1)).toEqual({ canDecrease: true, canIncrease: false }));
  it('step이 남은 칸보다 크면 막는다', () =>
    expect(counterBounds(2, 0, 3, 2)).toEqual({ canDecrease: true, canIncrease: false }));
});
