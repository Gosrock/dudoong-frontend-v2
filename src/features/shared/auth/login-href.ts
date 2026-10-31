import { safeRedirect } from '@/utils/redirect';

/** 로그인 화면 주소(게이트, 익명 사용자의 사용자별 버튼). 돌아올 곳이 로그인 화면 자체면 붙이지 않는다 */
export function loginHref(returnTo?: string | null) {
  const to = safeRedirect(returnTo, '');
  return to && to !== '/' ? `/login?redirect=${encodeURIComponent(to)}` : '/login';
}

/** 세션 만료 안내 화면 주소. `onSessionLost`만 보낸다(게이트는 보내지 않는다) */
export function expiredHref(returnTo?: string | null) {
  const to = safeRedirect(returnTo, '');
  return to && to !== '/' ? `/login/expired?redirect=${encodeURIComponent(to)}` : '/login/expired';
}
