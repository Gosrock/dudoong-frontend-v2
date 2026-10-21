import { http, HttpResponse } from 'msw';

import { me } from './fixtures/me';
import { errors, fail, MOCK_ACCESS_TOKEN, MOCK_REFRESH_TOKEN, ok } from './respond';

/**
 * v1 인증(`/api/v1/auth`, api-contract §9) 중 P4a가 쓰는 재발급·로그아웃. 카카오 OAuth는 P4b가 더한다.
 * 쿠키는 백엔드처럼 응답 `Set-Cookie`로 세팅한다(FE는 쿠키를 쓰지 않는다).
 */

const cookie = (name: string, value: string, maxAge: number) =>
  `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;

/** 로그인·재발급 응답 본문 `TokenAndUserResponse`. FE는 본문을 쓰지 않는다 */
const tokenAndUser = () => ({
  accessToken: MOCK_ACCESS_TOKEN,
  accessTokenAge: 3600,
  refreshToken: MOCK_REFRESH_TOKEN,
  refreshTokenAge: 3600,
  userProfile: { id: me.userId, profileImage: me.profileImageUrl, name: me.name },
});

/** 재발급 성공 응답 — 새 액세스·리프레시 쿠키 */
export function refreshed() {
  const res = ok(tokenAndUser());
  res.headers.append('set-cookie', cookie('accessToken', MOCK_ACCESS_TOKEN, 3600));
  res.headers.append('set-cookie', cookie('refreshToken', MOCK_REFRESH_TOKEN, 3600));
  return res;
}

/** 로그아웃 — 쿠키 삭제. 백엔드 본문은 `data: null` 래퍼다 */
function loggedOut() {
  const res = ok(null);
  res.headers.append('set-cookie', cookie('accessToken', '', 0));
  res.headers.append('set-cookie', cookie('refreshToken', '', 0));
  return res;
}

export const authHandlers = {
  /** 기본: 리프레시 쿠키가 `MOCK_REFRESH_TOKEN`이면 성공, 아니면 403 `AUTH_403_1`. 로그아웃은 언제나 200 */
  byCookie: [
    http.post('*/api/v1/auth/token/refresh', ({ request, cookies }) =>
      cookies.refreshToken === MOCK_REFRESH_TOKEN ? refreshed() : errors.refreshRejected(request),
    ),
    http.post('*/api/v1/auth/logout', () => loggedOut()),
  ],
  refreshOk: [http.post('*/api/v1/auth/token/refresh', () => refreshed())],
  refreshRejected: [
    http.post('*/api/v1/auth/token/refresh', ({ request }) => errors.refreshRejected(request)),
  ],
  refreshServerError: [
    http.post('*/api/v1/auth/token/refresh', ({ request }) => errors.serverError(request)),
  ],
  /** 낡은 액세스 쿠키를 JWT 필터가 재발급 앞에서 거절(backend-questions B6) */
  refreshStaleAccess: [
    http.post('*/api/v1/auth/token/refresh', ({ request }) =>
      fail(request, 401, 'AUTH_401_1', '인증 토큰이 만료되었습니다.'),
    ),
  ],
  /** 만료·잘못된 액세스 쿠키가 실린 로그아웃(JWT 필터 401, 쿠키를 지우지 않는다) */
  logoutStaleAccess: [
    http.post('*/api/v1/auth/logout', ({ request }) =>
      fail(request, 401, 'AUTH_401_1', '인증 토큰이 만료되었습니다.'),
    ),
  ],
  logoutServerError: [
    http.post('*/api/v1/auth/logout', () => new HttpResponse('<html>502</html>', { status: 502 })),
  ],
};
