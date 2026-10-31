import { http } from 'msw';

import { eventBrowseSets } from '@/api/__mocks__/event.handlers';

import { setMockSession } from './support/auth';
import { KAKAO_SCRAP_UA } from './support/env';
import { expect, test } from './support/fixtures';

/**
 * 공연홈 `/` 라우트 로직(P5a-L) — 서버 조회(GP-1), 토큰 미전송, 상태 코드만 본다. 캡처는 없다(V).
 */

test.describe('공연홈 /', () => {
  test('서버가 GP-1을 조회해 그리고, 브라우저는 다시 조회하지 않는다', async ({
    page,
    mockApi,
  }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('link', { name: '고스락 제37회 정기공연' })).toHaveAttribute(
      'href',
      '/events/101',
    );
    await expect(page.getByRole('link', { name: '공연 둘러보기' })).toHaveAttribute(
      'href',
      '/events',
    );
    const homeCalls = mockApi.calls().filter((c) => c.path.startsWith('/api/v2/home'));
    expect(homeCalls.map((c) => c.from)).toEqual(['server']);
  });

  test('로그인한 사용자가 열어도 서버 조회(GP-1)에는 토큰이 붙지 않는다', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    const seen: (string | null)[] = [];
    mockApi.use(
      http.get('*/api/v2/home', ({ request }) => {
        seen.push(request.headers.get('cookie'));
        return undefined;
      }),
    );
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('link', { name: '고스락 제37회 정기공연' })).toBeVisible();
    expect(seen).toEqual([null]);
  });

  test('공연이 없어도 200으로 열린다', async ({ page, mockApi }) => {
    mockApi.use(...eventBrowseSets.homeEmpty);
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
    await expect(page.getByText('예정된 공연이 없어요.')).toBeVisible();
  });

  test('GP-1이 5xx면 카카오 크롤러는 500을 받는다', async ({ request, mockApi }) => {
    mockApi.use(...eventBrowseSets.homeServerError);
    const res = await request.get('/', { headers: { 'User-Agent': KAKAO_SCRAP_UA } });
    expect(res.status()).toBe(500);
  });
});
