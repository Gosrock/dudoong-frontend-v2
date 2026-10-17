import { http, HttpResponse } from 'msw';

import { KAKAO_SCRAP_UA } from './support/env';
import { expect, test } from './support/fixtures';

test.describe('공연홈 /', () => {
  test('서버가 GE-11을 조회해 태그를 그리고, 브라우저는 다시 조회하지 않는다', async ({
    page,
    mockApi,
  }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: '장르' })).toBeVisible();
    await expect(page.getByRole('button', { name: '락밴드' })).toBeVisible();
    // <Prefetch>가 넘긴 캐시를 브라우저가 읽는다(staleTime 30초) — 브라우저발 조회 0건
    const tagCalls = mockApi.calls().filter((c) => c.path.startsWith('/api/v2/tags'));
    expect(tagCalls.map((c) => c.from)).toEqual(['server']);
  });

  test('백엔드 5xx면 카카오 크롤러는 500을 받는다', async ({ request, mockApi }) => {
    mockApi.use(
      http.get('*/api/v2/tags', () =>
        HttpResponse.json(
          { success: false, status: 500, code: 'GLOBAL_500_1', reason: '', timeStamp: '' },
          { status: 500 },
        ),
      ),
    );
    const res = await request.get('/', { headers: { 'User-Agent': KAKAO_SCRAP_UA } });
    expect(res.status()).toBe(500);
  });
});
