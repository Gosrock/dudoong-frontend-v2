import {
  HIDDEN_NOTICE_ID,
  HOST_NOTICE_ID,
  MISSING_NOTICE_ID,
  SANITIZE_NOTICE_ID,
} from '@/api/__mocks__/fixtures/notice';
import { noticeHandlers } from '@/api/__mocks__/notice.handlers';

import { setMockSession } from './support/auth';
import { KAKAO_SCRAP_UA } from './support/env';
import { expect, test } from './support/fixtures';

/**
 * 서비스 공지(P9c-L) 라우트 로직 — 관객 상세(서버 조회)의 상태 코드·제목·본문 sanitize, 관객 목록(브라우저 조회),
 * 호스팅 센터 목록·상세(로그인 게이트, 서버 조회 없음). 화면은 L 단계의 최소 마크업이다. 캡처는 없다(V).
 * 상단 배너는 셸에 붙지 않아(P4s-V) 훅 테스트(`useNotice.test`)에서 본다.
 */

test.describe('관객 공지 상세 — 상태 코드', () => {
  test('있는 공지는 200이고 제목에 공지 제목, 서버 조회에는 audience 없이 GA-2 한 번', async ({
    request,
    mockApi,
  }) => {
    const res = await request.get(`/notices/${SANITIZE_NOTICE_ID}`, {
      headers: { 'User-Agent': KAKAO_SCRAP_UA },
    });
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('<title>[점검] 11월 2일 새벽 서버 점검 안내 | 두둥</title>');
    expect(mockApi.calls().map((c) => `${c.from} ${c.path}`)).toEqual([
      `server /api/v2/notices/${SANITIZE_NOTICE_ID}`,
    ]);
  });

  test('호스팅 센터 전용(HOST) 공지도 관객 주소로 열린다(공유 링크)', async ({ request }) => {
    const res = await request.get(`/notices/${HOST_NOTICE_ID}`, {
      headers: { 'User-Agent': KAKAO_SCRAP_UA },
    });
    expect(res.status()).toBe(200);
  });

  for (const [name, id] of [
    ['숨긴 공지', HIDDEN_NOTICE_ID],
    ['없는 공지', MISSING_NOTICE_ID],
  ] as const) {
    test(`${name}는 404`, async ({ request }) => {
      const res = await request.get(`/notices/${id}`, {
        headers: { 'User-Agent': KAKAO_SCRAP_UA },
      });
      expect(res.status()).toBe(404);
    });
  }

  test('숫자가 아닌 id는 백엔드를 부르지 않고 404', async ({ request, mockApi }) => {
    const res = await request.get('/notices/abc', { headers: { 'User-Agent': KAKAO_SCRAP_UA } });
    expect(res.status()).toBe(404);
    expect(mockApi.calls()).toEqual([]);
  });

  test('GA-2가 5xx면 500', async ({ request, mockApi }) => {
    mockApi.use(...noticeHandlers.detailServerError);
    const res = await request.get(`/notices/${SANITIZE_NOTICE_ID}`, {
      headers: { 'User-Agent': KAKAO_SCRAP_UA },
    });
    expect(res.status()).toBe(500);
  });
});

test.describe('관객 공지 — 화면', () => {
  test('상세 본문은 sanitize되어 그려진다(스크립트·이벤트 속성·javascript: 링크 없음)', async ({
    page,
  }) => {
    const dialogs: string[] = [];
    page.on('dialog', (d) => {
      dialogs.push(d.message());
      void d.dismiss();
    });
    await page.goto(`/notices/${SANITIZE_NOTICE_ID}`);
    const content = page.getByTestId('notice-content');
    await expect(content).toContainText('11월 2일 02:00~04:00 서버 점검이 있어요.');
    const html = await content.innerHTML();
    expect(html).not.toMatch(/<script|onclick|javascript:/);
    await expect(content.getByRole('link', { name: '이용약관' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    await expect(page.getByRole('link', { name: '목록' })).toHaveAttribute('href', '/notices');
    expect(dialogs).toEqual([]);
  });

  test('목록은 브라우저에서만 audience=USER로 읽는다 — ALL 공지만, 고정 먼저, [더 보기]로 page=1', async ({
    page,
    mockApi,
  }) => {
    const res = await page.goto('/notices');
    expect(res?.status()).toBe(200);
    const rows = page.getByTestId('notice');
    await expect(rows).toHaveCount(20);
    await expect(rows.first()).toHaveAttribute('data-pinned', 'true');
    await expect(rows.first().getByRole('link')).toHaveAttribute(
      'href',
      `/notices/${SANITIZE_NOTICE_ID}`,
    );
    await expect(page.locator('[data-host-only="true"]')).toHaveCount(0);
    await page.getByRole('button', { name: '더 보기' }).click();
    await expect(rows).toHaveCount(24);
    const calls = mockApi.calls().filter((c) => c.path.startsWith('/api/v2/notices'));
    expect(calls.map((c) => `${c.from} ${c.path}`)).toEqual([
      'browser /api/v2/notices?audience=USER&page=0',
      'browser /api/v2/notices?audience=USER&page=1',
    ]);
  });
});

test.describe('호스팅 센터 공지', () => {
  test('비로그인이면 로그인으로 가고 돌아올 곳이 남는다', async ({ page }) => {
    await setMockSession(page, 'anonymous');
    await page.goto('/hosting/notices');
    await expect(page).toHaveURL(`/login?redirect=${encodeURIComponent('/hosting/notices')}`);
  });

  test('로그인하면 목록에 HOST 공지가 섞이고 상세는 /hosting/notices/{id} — 서버는 /api를 부르지 않는다', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    const res = await page.goto('/hosting/notices');
    expect(res?.status()).toBe(200);
    const hostRow = page.locator('[data-host-only="true"]').first();
    await expect(hostRow.getByRole('link')).toHaveAttribute(
      'href',
      `/hosting/notices/${HOST_NOTICE_ID}`,
    );
    await hostRow.getByRole('link').click();
    await expect(page).toHaveURL(`/hosting/notices/${HOST_NOTICE_ID}`);
    await expect(
      page.getByRole('heading', { name: '[호스트] 두둥티켓 환불 의무 안내' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: '목록' })).toHaveAttribute(
      'href',
      '/hosting/notices',
    );
    const calls = mockApi.calls();
    expect(calls.filter((c) => c.from === 'server')).toEqual([]);
    expect(calls.filter((c) => c.path.startsWith('/api/v2/notices')).map((c) => c.path)).toEqual([
      '/api/v2/notices?audience=HOST&page=0',
      `/api/v2/notices/${HOST_NOTICE_ID}`,
    ]);
  });

  test('숨긴 공지는 공용 404 + 공지 목록으로(클라이언트 판정이라 200)', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    const res = await page.goto(`/hosting/notices/${HIDDEN_NOTICE_ID}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByText('공지를 찾을 수 없어요')).toBeVisible();
    await expect(page.getByRole('link', { name: '공지 목록' })).toHaveAttribute(
      'href',
      '/hosting/notices',
    );
  });
});
