import { http } from 'msw';

import { me } from './fixtures/me';
import { errors, ok, requireAuth } from './respond';

/**
 * GM-1 세션. 기본(`byCookie`)은 백엔드처럼 액세스 토큰 쿠키로 정한다 — 로그인 · 비로그인(401 `AUTH_401_2`) ·
 * 만료(`accessToken=expired` → 401 `AUTH_401_1`, 재발급은 `auth.handlers.ts`) · 위조(`accessToken=forged` → 401
 * `GLOBAL_401_1` + 액세스 쿠키 삭제). 쿠키 값은 `respond.ts`의 mock 세션 상태.
 * 테스트는 `server.use(...meHandlers.loggedIn)`처럼 상태를 고정한다.
 */
export const meHandlers = {
  byCookie: [
    http.get('*/api/v2/me', ({ request, cookies }) => requireAuth(request, cookies) ?? ok(me)),
  ],
  loggedIn: [http.get('*/api/v2/me', () => ok(me))],
  anonymous: [http.get('*/api/v2/me', ({ request }) => errors.noToken(request))],
  expired: [http.get('*/api/v2/me', ({ request }) => errors.expiredToken(request))],
};
