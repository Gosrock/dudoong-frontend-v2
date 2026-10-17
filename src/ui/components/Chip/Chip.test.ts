import { describe, expect, it } from 'vitest';

import { formatDday, formatOptionAmount } from './Chip';

describe('formatDday', () => {
  it('0은 D-day', () => expect(formatDday(0)).toBe('D-day'));
  it('남은 날', () => expect(formatDday(7)).toBe('D-7'));
  it('지난 날', () => expect(formatDday(-2)).toBe('D+2'));
});

describe('formatOptionAmount', () => {
  it('천 단위 쉼표와 부호', () => {
    expect(formatOptionAmount(1000)).toBe('+ 1,000원');
    expect(formatOptionAmount(0)).toBe('+ 0원');
    expect(formatOptionAmount(-500)).toBe('- 500원');
  });
});
