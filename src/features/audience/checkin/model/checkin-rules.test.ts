import { describe, expect, it } from 'vitest';

import { parseCheckInToken } from './check-in-params';
import { SELF_CHECK_IN_ERRORS, selfCheckInError } from './self-check-in-errors';

describe('셀프 체크인 토큰', () => {
  it.each([
    ['mock-checkin-101', 'mock-checkin-101'],
    [' abc_DEF-1 ', 'abc_DEF-1'],
    ['a'.repeat(64), 'a'.repeat(64)],
    ['a'.repeat(65), null],
    ['', null],
    ['abc def', null],
    [undefined, null],
    [['a', 'b'], null],
  ] as const)('%j → %s', (raw, token) => {
    expect(parseCheckInToken(raw as string | string[] | undefined)).toBe(token);
  });
});

describe('셀프 체크인 에러 — patterns §24 P8c 행', () => {
  it.each([
    ['Event_400_26', 'INVALID_QR', '잘못된 체크인 QR이에요', false],
    ['Event_400_5', 'EVENT_NOT_OPEN', '지금은 셀프 체크인을 할 수 없는 공연이에요', false],
    ['IssuedTicket_400_1', 'NOT_MY_TICKET', '내 티켓이 아니에요', false],
    ['GLOBAL_500_1', 'FAILED', '체크인하지 못했어요', true],
    ['NETWORK', 'FAILED', '체크인하지 못했어요', true],
    [null, 'FAILED', '체크인하지 못했어요', true],
  ] as const)('%s → %s', (code, kind, title, canRetry) => {
    expect(selfCheckInError(code)).toMatchObject({ kind, title, canRetry });
  });

  it('공연이 끝나면 호스트에게 티켓 QR을 보여 주라고 안내한다', () => {
    expect(SELF_CHECK_IN_ERRORS.EVENT_NOT_OPEN.description).toBe(
      '호스트에게 티켓 QR을 보여 주세요',
    );
  });
});
