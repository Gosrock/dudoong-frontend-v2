import { describe, expect, it } from 'vitest';

import { formatCount, formatPrice, formatSignedWon, formatWon } from './money';

describe('money', () => {
  it('formatCount — 천 단위 쉼표', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(1234567)).toBe('1,234,567');
  });

  it('formatWon — 붙여 쓴다', () => {
    expect(formatWon(1000)).toBe('1,000원');
    expect(formatWon(0)).toBe('0원');
  });

  it('formatPrice — 0원은 무료', () => {
    expect(formatPrice(0)).toBe('무료');
    expect(formatPrice(25000)).toBe('25,000원');
  });

  it('formatSignedWon — 부호를 붙여 쓴다', () => {
    expect(formatSignedWon(1000)).toBe('+1,000원');
    expect(formatSignedWon(0)).toBe('+0원');
    expect(formatSignedWon(-500)).toBe('-500원');
  });
});
