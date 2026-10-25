import { getErrorCode } from '@/api/errors';

/**
 * 로그인 화면·카카오 콜백의 실패 판정(tech-decisions §4 인증 표 "로그인 콜백", patterns §24 P4b).
 *
 * | 실패 | 조건 | 화면 |
 * |---|---|---|
 *  * | `suspended` | 403 `USER_403_1` — 정지 계정(탈퇴한 사람은 가입 흐름으로 간다) | "이용이 제한된 계정이에요" |
 * | `restart` | 400 `AUTH_400_1` — OAuth `state` 불일치 | 로그인을 처음부터(로그인 화면으로) |
 * | `failed` | 그 밖(카카오 코드 재사용 `KAKAO_KOE320`, 5xx, 네트워크, 응답 누락 …) | 일반 실패 + 다시 로그인 |
 *
 * 예전(24aa595)에는 만료·잘못된 액세스 쿠키가 남아 있으면 JWT 필터가 OAuth 경로에서도 401을 내 "잠시 후 다시"(`retryLater`)로
 * 안내했다. 백엔드 #792로 `/oauth/**`는 낡은 쿠키가 있어도 익명으로 통과해 그 401이 없어졌다(backend-questions B6 해결) —
 * 분기를 지웠다. 혹시 401이 오면 일반 실패다.
 */
export type AuthFailure = 'suspended' | 'restart' | 'failed';

export const SUSPENDED_CODE = 'USER_403_1';
export const STATE_MISMATCH_CODE = 'AUTH_400_1';

export function classifyAuthFailure(e: unknown): AuthFailure {
  const code = getErrorCode(e);
  if (code === SUSPENDED_CODE) return 'suspended';
  if (code === STATE_MISMATCH_CODE) return 'restart';
  return 'failed';
}

/** 실패마다 보여 줄 문구. 화면 문구는 코드로 정한다(`reason`을 그대로 쓰지 않는다 — api-contract §1) */
export const AUTH_FAILURE_MESSAGE: Record<Exclude<AuthFailure, 'restart'>, string> = {
  suspended: '이용이 제한된 계정이에요.',
  failed: '로그인하지 못했어요. 다시 시도해 주세요.',
};

/**
 * 카카오 콜백 주소(`/kakao/callback?code=…&state=…`)의 해석.
 * - `code` — 인가 코드. `state`는 없을 수 있다(#776 전까지 백엔드가 통과시킨다)
 * - `denied` — 카카오에서 동의를 취소했거나 카카오가 오류로 돌려보냄(`?error=access_denied&…`). 로그인 화면으로 돌아간다
 * - `invalid` — 둘 다 없음(주소를 직접 열었다)
 */
export type CallbackParams =
  { kind: 'code'; code: string; state: string | null } | { kind: 'denied' } | { kind: 'invalid' };

export function readCallbackParams(params: URLSearchParams): CallbackParams {
  if (params.get('error')) return { kind: 'denied' };
  const code = params.get('code');
  if (!code) return { kind: 'invalid' };
  const state = params.get('state');
  return { kind: 'code', code, state: state || null };
}
