import { describe, expect, it } from 'vitest';

import { ApiError, SessionLostError } from '@/api/errors';

import { type AuthFailure, classifyAuthFailure, readCallbackParams } from './auth-outcome';

describe('로그인·콜백 실패 판정(에러 코드별, patterns §24 P4b)', () => {
  it.each<[string, unknown, AuthFailure]>([
    [
      '정지 계정 로그인 403 USER_403_1 → 이용 제한 안내',
      new ApiError(403, 'USER_403_1', ''),
      'suspended',
    ],
    [
      'OAuth state 불일치 400 AUTH_400_1 → 처음부터 다시',
      new ApiError(400, 'AUTH_400_1', ''),
      'restart',
    ],
    [
      '낡은 액세스 쿠키 401 AUTH_401_1 → 잠시 후 다시',
      new ApiError(401, 'AUTH_401_1', ''),
      'retryLater',
    ],
    [
      '잘못된 액세스 쿠키 401 GLOBAL_401_1 → 잠시 후 다시',
      new ApiError(401, 'GLOBAL_401_1', ''),
      'retryLater',
    ],
    [
      '토큰 없음 401 AUTH_403_2(본문 403) → 잠시 후 다시(HTTP 상태로 본다)',
      new ApiError(401, 'AUTH_403_2', ''),
      'retryLater',
    ],
    ['세션 상실(401) → 잠시 후 다시', new SessionLostError(), 'retryLater'],
    [
      '카카오 인가 코드 재사용 400 KAKAO_KOE320 → 일반 실패',
      new ApiError(400, 'KAKAO_KOE320', ''),
      'failed',
    ],
    [
      '카카오 id 토큰 만료 400 KAKAO_KOE403 → 일반 실패',
      new ApiError(400, 'KAKAO_KOE403', ''),
      'failed',
    ],
    [
      '카카오 사용자 정보 실패 400 FEIGN_400_2 → 일반 실패',
      new ApiError(400, 'FEIGN_400_2', ''),
      'failed',
    ],
    ['사용자 없음 404 USER_404_1 → 일반 실패', new ApiError(404, 'USER_404_1', ''), 'failed'],
    [
      '허용되지 않은 출처 403 AUTH_403_3 → 일반 실패',
      new ApiError(403, 'AUTH_403_3', ''),
      'failed',
    ],
    ['서버 오류 500 → 일반 실패', new ApiError(500, 'GLOBAL_500_1', ''), 'failed'],
    ['nginx HTML 502 → 일반 실패', new ApiError(502, 'NON_JSON', ''), 'failed'],
    ['네트워크 끊김 → 일반 실패', new ApiError(0, 'NETWORK', ''), 'failed'],
    [
      '응답에 카카오 토큰이 없음(ApiError 아님) → 일반 실패',
      new Error('kakao id token missing'),
      'failed',
    ],
  ])('%s', (_, error, expected) => {
    expect(classifyAuthFailure(error)).toBe(expected);
  });
});

describe('카카오 콜백 주소 해석', () => {
  it.each<[string, string, ReturnType<typeof readCallbackParams>]>([
    [
      '코드와 state가 있으면 둘 다 넘긴다',
      '?code=abc&state=s1',
      { kind: 'code', code: 'abc', state: 's1' },
    ],
    [
      'state가 없어도 코드로 진행한다(#776 전까지 백엔드가 통과)',
      '?code=abc',
      { kind: 'code', code: 'abc', state: null },
    ],
    ['빈 state는 없는 것으로 본다', '?code=abc&state=', { kind: 'code', code: 'abc', state: null }],
    [
      '동의를 취소하면 카카오가 error로 돌려보낸다',
      '?error=access_denied&error_description=x&state=s1',
      { kind: 'denied' },
    ],
    [
      'error가 있으면 코드가 있어도 취소로 본다',
      '?error=server_error&code=abc',
      { kind: 'denied' },
    ],
    ['둘 다 없으면 잘못 들어온 것', '', { kind: 'invalid' }],
    ['빈 코드는 없는 것', '?code=', { kind: 'invalid' }],
  ])('%s', (_, search, expected) => {
    expect(readCallbackParams(new URLSearchParams(search))).toEqual(expected);
  });
});
