import { describe, expect, it } from 'vitest';

import { formatBadgeCount } from './Badge';

describe('formatBadgeCount', () => {
  it('max 이하는 그대로', () => {
    expect(formatBadgeCount(0)).toBe('0');
    expect(formatBadgeCount(99)).toBe('99');
  });
  it('max를 넘으면 max+', () => {
    expect(formatBadgeCount(100)).toBe('99+');
    expect(formatBadgeCount(1000, 999)).toBe('999+');
  });
});
