import { describe, expect, it } from 'vitest';

import { phoneExactMatch } from './guest-store';

/** mock 연락처 완전 일치 = 백엔드 `ContactSearch.phoneExact`(#822, fe423ed4) — 일반 멤버 검색 */
describe('mock 연락처 완전 일치 = ContactSearch.phoneExact', () => {
  it.each([
    ['010-1234-5678', '01012345678', true],
    ['010-1234-5678', '010-1234-5678', true],
    ['010-1234-5678', '+82 10-1234-5678', true],
    ['010-1234-5678', '821012345678', true],
    ['+82 10-1234-5678', '010-1234-5678', true],
    ['+82 10-1234-5678', '01012345678', true],
    ['010-1234-5678', '1234-5678', false],
    ['010-1234-5678', '0101234567', false],
    ['010-1234-5678', '없음', false],
    ['', '', false],
  ])('저장 %j · 입력 %j → %s', (stored, keyword, expected) => {
    expect(phoneExactMatch(stored, keyword)).toBe(expected);
  });
});
