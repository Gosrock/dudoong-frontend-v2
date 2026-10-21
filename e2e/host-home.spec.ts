import { http } from 'msw';

import { MISSING_HOST_ID } from '@/api/__mocks__/fixtures/host';
import { hostSets } from '@/api/__mocks__/host.handlers';

import { setMockSession } from './support/auth';
import { KAKAO_SCRAP_UA } from './support/env';
import { expect, test } from './support/fixtures';

/**
 * 호스트 홈 `/hosts/[hostId]` 라우트 로직(P5c-L) — 상태 코드, 서버 조회 토큰 미전송, viewer 분리, 비로그인 ♡ → 로그인 → 복귀,
 * 멤버의 준비중 공연 링크. 화면은 L 단계의 최소 마크업이다. 캡처는 없다(V).
 */

test.describe('호스트 홈 — 상태 코드', () => {
  test('있는 호스트는 200이고 제목에 호스트 이름이 있다', async ({ request }) => {
    const res = await request.get('/hosts/11', { headers: { 'User-Agent': KAKAO_SCRAP_UA } });
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('<title>고스락 | 두둥</title>');
  });

  test('없는 호스트는 카카오 크롤러에 404', async ({ request }) => {
    const res = await request.get(`/hosts/${MISSING_HOST_ID}`, {
      headers: { 'User-Agent': KAKAO_SCRAP_UA },
    });
    expect(res.status()).toBe(404);
  });

  test('숫자가 아닌 id는 백엔드를 부르지 않고 404', async ({ request, mockApi }) => {
    const res = await request.get('/hosts/abc', { headers: { 'User-Agent': KAKAO_SCRAP_UA } });
    expect(res.status()).toBe(404);
    expect(mockApi.calls()).toEqual([]);
  });

  test('GH-3이 5xx면 카카오 크롤러는 500을 받는다', async ({ request, mockApi }) => {
    mockApi.use(...hostSets.detailServerError(11));
    const res = await request.get('/hosts/11', { headers: { 'User-Agent': KAKAO_SCRAP_UA } });
    expect(res.status()).toBe(500);
  });
});

test.describe('호스트 홈 — 조회 위치와 시점', () => {
  test('로그인(마스터)해도 서버 조회에는 토큰이 없고, 사용자별 값은 브라우저가 쿠키로 따로 읽는다', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    const seen: { from: string; cookie: boolean }[] = [];
    mockApi.use(
      http.get('*/api/v2/hosts/11', ({ request }) => {
        seen.push({
          from: request.headers.get('user-agent')?.startsWith('Mozilla/') ? 'browser' : 'server',
          cookie: (request.headers.get('cookie') ?? '').includes('accessToken='),
        });
        return undefined;
      }),
    );
    const res = await page.goto('/hosts/11');
    expect(res?.status()).toBe(200);
    // 마스터: 관리 버튼, 멤버 줄, 준비중 공연(호스팅 센터로)
    await expect(page.getByRole('link', { name: '설정' })).toHaveAttribute(
      'href',
      '/hosting/hosts/11/settings',
    );
    await expect(page.getByRole('list', { name: '멤버' })).toBeVisible();
    await expect(page.getByRole('link', { name: '고스락 신입 환영 공연(준비중)' })).toHaveAttribute(
      'href',
      '/hosting/events/140',
    );
    expect(seen).toEqual([
      { from: 'server', cookie: false },
      { from: 'browser', cookie: true },
    ]);
    const events = mockApi.calls().filter((c) => c.path.startsWith('/api/v2/hosts/11/events'));
    // 공개 목록을 그렸다가 바꾸지 않는다 — 멤버 키로 한 번만
    expect(events.map((c) => `${c.from} ${c.path}`)).toEqual([
      'browser /api/v2/hosts/11/events?page=0',
    ]);
  });

  test('비로그인은 viewer·멤버를 부르지 않고, 공개 공연만 공개 상세로 링크한다', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'anonymous');
    await page.goto('/hosts/11');
    await expect(page.getByRole('link', { name: '고스락 제37회 정기공연' })).toHaveAttribute(
      'href',
      '/events/101',
    );
    await expect(page.getByText('고스락 신입 환영 공연(준비중)')).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: '호스트 관리' })).toHaveCount(0);
    const hostCalls = mockApi
      .calls()
      .filter((c) => c.path.startsWith('/api/v2/hosts/11') && c.from === 'browser');
    expect(hostCalls.map((c) => c.path)).toEqual(['/api/v2/hosts/11/events?page=0']);
  });

  test('비로그인 사용자가 ♡를 누르면 요청 없이 로그인으로 가고, 로그인 뒤 호스트 홈으로 돌아와 ♡를 누를 수 있다', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'anonymous');
    await page.goto('/hosts/11');
    await page.getByRole('link', { name: '관심 호스트' }).click();
    await expect(page).toHaveURL(/\/login\?redirect=%2Fhosts%2F11$/);

    await page.getByRole('button', { name: '카카오 로그인/회원가입' }).click();
    await page.getByRole('link', { name: '기존 사용자로 로그인', exact: true }).click();
    await expect(page).toHaveURL(/\/hosts\/11$/);

    // 고스락은 팔로우하지 않은 상태 — 독립된 팔로우 상태로 시작한다
    const follow = page.getByRole('button', { name: '관심 호스트' });
    await expect(follow).toBeEnabled();
    await expect(follow).toHaveAttribute('aria-pressed', 'false');
    mockApi.use(...hostSets.viewAs(11, { myRole: 'MASTER', isFollowing: false }));
    await follow.click();
    await expect(follow).toHaveAttribute('aria-pressed', 'true');
    await follow.click();
    await expect(follow).toHaveAttribute('aria-pressed', 'false');
    const put = mockApi.calls().filter((c) => c.path === '/api/v2/hosts/11/follow');
    expect(put.map((c) => `${c.method} ${c.status}`)).toEqual(['PUT 200', 'DELETE 200']);
  });
});
