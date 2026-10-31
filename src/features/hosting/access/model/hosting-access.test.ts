import { describe, expect, it } from 'vitest';

import { ApiError, SessionLostError } from '@/api/errors';

import { hostingAccessOfError, hostingAccessOfRole } from './hosting-access';

describe('비멤버 403 판정 — 조회 에러(HTTP 상태로 분기)', () => {
  it.each([
    ['403 HOST_400_2(멤버 아님)', new ApiError(403, 'HOST_400_2', ''), 'forbidden'],
    ['403 HOST_400_1(매니저 아님)', new ApiError(403, 'HOST_400_1', ''), 'forbidden'],
    ['404 Event_404_1(없는·남의 공연)', new ApiError(404, 'Event_404_1', ''), 'notFound'],
    ['404 Host_404_1', new ApiError(404, 'Host_404_1', ''), 'notFound'],
    // code 문자열이 HOST_400_*여도 HTTP 400이면 권한 실패가 아니다
    ['400 HOST_400_16', new ApiError(400, 'HOST_400_16', ''), 'error'],
    ['500', new ApiError(500, 'GLOBAL_500_1', ''), 'error'],
    ['네트워크', new ApiError(0, 'NETWORK', ''), 'error'],
    ['세션 상실(경계가 거른다)', new SessionLostError(), 'error'],
    ['ApiError 아님', new Error('x'), 'error'],
  ])('%s → %s', (_, error, access) => {
    expect(hostingAccessOfError(error)).toBe(access);
  });
});

describe('비멤버 403 판정 — 판정 역할', () => {
  it.each([
    [null, 'forbidden'],
    [undefined, 'forbidden'],
    ['UNKNOWN', 'forbidden'],
    ['GUEST', 'ok'],
    ['MANAGER', 'ok'],
    ['MASTER', 'ok'],
    // G+ 조회 성공 + myRole null → superAdminOrRole이 만든 값(사용자 결정 2026-10-31)
    ['SUPER_ADMIN', 'ok'],
  ] as const)('myRole %j → %s', (role, access) => {
    expect(hostingAccessOfRole(role)).toBe(access);
  });
});
