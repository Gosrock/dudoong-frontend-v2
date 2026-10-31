import { http, type HttpHandler } from 'msw';

import { userError } from './me.handlers';
import { ok, requireAuth } from './respond';

/** 탈퇴 응답은 로그아웃처럼 두둥 토큰 쿠키 2개를 지운다(`CookieHelper.deleteCookies`) */
function withdrawn() {
  const res = ok(null);
  res.headers.append('set-cookie', 'accessToken=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
  res.headers.append('set-cookie', 'refreshToken=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
  return res;
}

/**
 * 회원 탈퇴 v1 `DELETE /api/v1/auth/me`(보호 — 액세스 토큰 쿠키 필요). 기본은 성공.
 * `masterBlocked` — 마스터인 호스트에 다른 활성 멤버·OPEN·정산중 공연이 있음(400 `USER_400_6`).
 */
export const userHandlers = {
  default: [
    http.delete(
      '*/api/v1/auth/me',
      ({ request, cookies }) => requireAuth(request, cookies) ?? withdrawn(),
    ),
  ] as HttpHandler[],
  masterBlocked: [
    http.delete('*/api/v1/auth/me', ({ request }) => userError(request, 'USER_400_6')),
  ] as HttpHandler[],
};
