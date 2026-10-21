import type { Page } from '@playwright/test';

import {
  EXPIRED_ACCESS_TOKEN,
  MOCK_ACCESS_TOKEN,
  MOCK_REFRESH_TOKEN,
} from '@/api/__mocks__/respond';

import { MOCK_ORIGIN } from './env';

/**
 * mock 세션 3상태(plan P4a)를 브라우저에 만든다. 쿠키 값 규칙은 `src/api/__mocks__/respond.ts`.
 * - `loggedIn` — 유효한 액세스·리프레시 쿠키 + `dd:session`
 * - `anonymous` — 쿠키도 표시도 없음
 * - `expired` — 액세스 쿠키 만료(보호 요청 401 `AUTH_401_1`) + 유효한 리프레시 쿠키 + `dd:session` → 재발급 성공
 * - `expiredRefreshFails` — 위와 같고 리프레시 토큰이 무효 → 재발급 403 `AUTH_403_1`(세션 상실)
 *
 * `dd:session`은 같은 출처 문서가 있어야 쓸 수 있어 `/healthz`를 한 번 연다(addInitScript로 세우면 로그아웃 뒤에도 되살아난다).
 */
export type MockSession = 'loggedIn' | 'anonymous' | 'expired' | 'expiredRefreshFails';

const COOKIES: Record<MockSession, Record<string, string>> = {
  loggedIn: { accessToken: MOCK_ACCESS_TOKEN, refreshToken: MOCK_REFRESH_TOKEN },
  anonymous: {},
  expired: { accessToken: EXPIRED_ACCESS_TOKEN, refreshToken: MOCK_REFRESH_TOKEN },
  expiredRefreshFails: { accessToken: EXPIRED_ACCESS_TOKEN, refreshToken: 'revoked' },
};

export const SESSION_KEY = 'dd:session';

export async function setMockSession(page: Page, state: MockSession) {
  const context = page.context();
  await context.clearCookies();
  const cookies = Object.entries(COOKIES[state]).map(([name, value]) => ({
    name,
    value,
    url: MOCK_ORIGIN,
  }));
  if (cookies.length > 0) await context.addCookies(cookies);
  await page.goto('/healthz');
  await page.evaluate(
    ([key, on]) => {
      if (on) localStorage.setItem(key, `e2e-${Math.random().toString(16).slice(2)}`);
      else localStorage.removeItem(key);
    },
    [SESSION_KEY, state !== 'anonymous'] as const,
  );
}

/** 이 페이지의 `dd:session` 값 */
export const readSessionFlag = (page: Page) =>
  page.evaluate((key) => localStorage.getItem(key), SESSION_KEY);
