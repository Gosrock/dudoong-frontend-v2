import { http } from 'msw';

import { me } from './fixtures/me';
import { errors, hasAccessToken, ok } from './respond';

/**
 * GM-1 세션. 기본은 백엔드처럼 액세스 토큰 쿠키가 있으면 로그인, 없으면 HTTP 401 `AUTH_403_2`.
 * 테스트는 `server.use(...meHandlers.loggedIn)`처럼 상태를 고정한다. 만료(재발급) 상태는 P4a가 더한다.
 */
export const meHandlers = {
  byCookie: [
    http.get('*/api/v2/me', ({ request, cookies }) =>
      hasAccessToken(cookies) ? ok(me) : errors.noToken(request),
    ),
  ],
  loggedIn: [http.get('*/api/v2/me', () => ok(me))],
  anonymous: [http.get('*/api/v2/me', ({ request }) => errors.noToken(request))],
};
