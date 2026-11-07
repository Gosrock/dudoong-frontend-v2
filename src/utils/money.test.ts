import { describe, expect, it } from 'vitest';

import {
  formatAmountInput,
  formatCount,
  formatPrice,
  formatSignedWon,
  formatWon,
  parseAmountInput,
} from './money';

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

  it('parseAmountInput — 숫자 글자만, 앞의 0은 지운다', () => {
    expect(parseAmountInput('1,000')).toBe('1000');
    expect(parseAmountInput('1,0a00원')).toBe('1000');
    expect(parseAmountInput('0050')).toBe('50');
    expect(parseAmountInput('0')).toBe('0');
    expect(parseAmountInput('')).toBe('');
    expect(parseAmountInput(',')).toBe('');
  });

  it('formatAmountInput — 천 단위 쉼표, 빈 칸은 빈 칸', () => {
    expect(formatAmountInput('')).toBe('');
    expect(formatAmountInput('0')).toBe('0');
    expect(formatAmountInput('999')).toBe('999');
    expect(formatAmountInput('1000')).toBe('1,000');
    expect(formatAmountInput('10000000')).toBe('10,000,000');
    expect(formatAmountInput('12345678901234567890')).toBe('12,345,678,901,234,567,890');
  });
});
