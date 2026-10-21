import { safeRedirect } from '@/utils/redirect';

/**
 * 카카오 왕복 동안 돌아올 곳(`redirect`)을 보관한다.
 *
 * 왜 `sessionStorage`인가: `redirect_uri`는 카카오 콘솔에 등록한 고정 주소(`{출처}/kakao/callback`)라 쿼리를 붙일 수 없고,
 * `state`는 백엔드가 만들어 쿠키와 비교하는 값이라(api-contract §9) FE가 내용을 넣을 수 없다. 카카오 인증은 같은 탭에서
 * 이동하고 돌아오므로 탭 단위 저장소가 맞다 — 다른 탭의 로그인과 섞이지 않는다.
 *
 * 저장할 때와 꺼낼 때 모두 `safeRedirect`로 거른다(오픈 리다이렉트 차단). 저장소를 못 쓰면 `/`로 돌아간다.
 */
export const LOGIN_REDIRECT_KEY = 'dd:loginRedirect';

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** 로그인 버튼을 누를 때. 검증을 통과하지 못하면 `/`를 저장한다 */
export function saveLoginRedirect(raw: string | null | undefined) {
  try {
    storage()?.setItem(LOGIN_REDIRECT_KEY, safeRedirect(raw));
  } catch {
    // 막힌 저장소 — 돌아올 곳 없이 `/`로 간다
  }
}

/** 콜백에서 읽는다(지우지 않는다 — 가입 폼에서 실패해 다시 시작할 때도 쓴다) */
export function readLoginRedirect(): string {
  try {
    return safeRedirect(storage()?.getItem(LOGIN_REDIRECT_KEY));
  } catch {
    return '/';
  }
}

/** 로그인이 끝나 이동하기 직전 */
export function clearLoginRedirect() {
  try {
    storage()?.removeItem(LOGIN_REDIRECT_KEY);
  } catch {
    // 무시
  }
}
