import { hostingSets, resetHostingStore } from '@/api/__mocks__/hosting.handlers';

import { setMockSession } from './support/auth';
import { expect, test } from './support/fixtures';

/**
 * P10a-L 라우트 로직 — 공연준비 홈(`/hosting`)·호스트 만들기(`/hosting/new/hosts`)·`/admin/*` 리다이렉트.
 * 호스팅 센터는 보호 화면이고 조회는 브라우저에서만 한다(셸만 렌더). 최소 마크업이라 상태·이동·요청만 본다(모양은 V).
 */
test.beforeEach(() => resetHostingStore());

test.describe('공연준비 홈', () => {
  test('비로그인이면 로그인으로 가고 돌아올 곳이 남는다', async ({ page }) => {
    await setMockSession(page, 'anonymous');
    await page.goto('/hosting?tab=hosts');
    await expect(page).toHaveURL(`/login?redirect=${encodeURIComponent('/hosting?tab=hosts')}`);
  });

  test('로그인하면 200, 공연 탭이 기본 — GE-1만 브라우저에서 읽고 서버는 /api를 부르지 않는다', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    const res = await page.goto('/hosting');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('tab', { name: '공연' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('my-event')).toHaveCount(4);
    await expect(
      page
        .getByTestId('my-event')
        .filter({ hasText: '고스락 신입 환영 공연(준비중)' })
        .getByRole('link'),
    ).toHaveAttribute('href', '/hosting/events/140');
    const calls = mockApi.calls();
    expect(calls.filter((c) => c.from === 'server')).toEqual([]);
    expect(calls.filter((c) => c.path.startsWith('/api/v2/me/')).map((c) => c.path)).toEqual([
      '/api/v2/me/events?page=0',
    ]);
  });

  test('호스트 탭으로 바꾸면 주소에 ?tab=hosts, 카드에 역할 — 새로고침해도 호스트 탭', async ({
    page,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting');
    await page.getByRole('tab', { name: '호스트' }).click();
    await expect(page).toHaveURL('/hosting?tab=hosts');
    const card = page.getByTestId('my-host');
    await expect(card).toHaveCount(1);
    await expect(card.getByRole('link', { name: '고스락' })).toHaveAttribute('href', '/hosts/11');
    await expect(card.getByTestId('my-role')).toHaveText('MASTER');
    await page.reload();
    await expect(page.getByRole('tab', { name: '호스트' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('호스트마다 역할이 다르다(마스터 · 일반 멤버)', async ({ page, mockApi }) => {
    mockApi.use(...hostingSets.mixedRoles);
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting?tab=hosts');
    await expect(page.getByTestId('my-role')).toHaveText(['MASTER', 'GUEST']);
  });

  test('검색어는 지금 탭 목록을 찾고, 결과가 없으면 검색 결과 없음', async ({ page, mockApi }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting');
    await expect(page.getByTestId('my-event')).toHaveCount(4);
    const search = page.getByRole('searchbox', { name: '검색' });
    await search.fill('정기공연');
    await expect(page.getByTestId('my-event')).toHaveCount(2);
    await search.fill('없는 공연');
    await expect(page.getByTestId('hosting-empty')).toHaveText('검색 결과가 없어요');
    expect(
      mockApi
        .calls()
        .filter((c) => c.path.startsWith('/api/v2/me/events'))
        .map((c) => new URL(c.path, 'http://x').searchParams.get('keyword')),
    ).toEqual([null, '정기공연', '없는 공연']);
  });

  test('소속 호스트가 없으면 호스트 탭 빈 상태 + [새 호스트 만들기]', async ({ page, mockApi }) => {
    mockApi.use(...hostingSets.noMembership);
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting?tab=hosts');
    const empty = page.getByTestId('hosting-empty');
    await expect(empty).toContainText('두둥! 등록한 호스트가 없어요.');
    await expect(empty.getByRole('link', { name: '새 호스트 만들기' })).toHaveAttribute(
      'href',
      '/hosting/new/hosts',
    );
  });
});

test.describe('호스트 만들기', () => {
  test('만들면 PH-2를 보내고 공연준비 홈 호스트 탭으로 — 새 호스트가 목록에 나온다', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    const res = await page.goto('/hosting/new/hosts');
    expect(res?.status()).toBe(200);
    await page.getByLabel('호스트 이름').fill('새 밴드');
    await page.getByLabel('연락처 유형 1').selectOption('YOUTUBE');
    const contact = page.getByLabel('연락처 1');
    await expect(contact).toHaveAttribute('placeholder', 'URL');
    await contact.fill('https://youtube.com/@newband');
    await page.getByRole('button', { name: '만들기' }).click();
    await expect(page).toHaveURL('/hosting?tab=hosts');
    await expect(page.getByTestId('my-host').first().getByRole('link')).toHaveText('새 밴드');
    await expect(page.getByTestId('my-host')).toHaveCount(2);
    expect(
      mockApi
        .calls()
        .filter((c) => c.method === 'POST')
        .map((c) => [c.from, c.path, c.status]),
    ).toEqual([['browser', '/api/v2/hosts', 200]]);
  });

  test('칸이 비면 요청 없이 오류를 보인다', async ({ page, mockApi }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/new/hosts');
    await page.getByRole('button', { name: '만들기' }).click();
    await expect(page.getByText('호스트 이름을 입력해 주세요')).toBeVisible();
    await expect(page.getByText('연락처 유형을 골라 주세요')).toBeVisible();
    expect(mockApi.calls().filter((c) => c.method === 'POST')).toEqual([]);
  });
});

test.describe('리다이렉트(next.config redirects)', () => {
  const cases: [string, string][] = [
    ['/hosting/events/101', '/hosting/events/101/dashboard'],
    ['/admin', '/hosting'],
    ['/admin/new/hosts', '/hosting/new/hosts'],
    ['/admin/new/events/2', '/hosting/new/events'],
    ['/admin/hosts/11/dashboard', '/hosts/11'],
    ['/admin/hosts/11/events', '/hosts/11'],
    ['/admin/hosts/11/slack', '/hosts/11'],
    ['/admin/hosts/11/alliance', '/hosts/11'],
    ['/admin/hosts/11/info', '/hosting/hosts/11/settings'],
    ['/admin/hosts/11/member', '/hosting/hosts/11/members'],
    ['/admin/events/101/dashboard', '/hosting/events/101/dashboard'],
    ['/admin/events/101/info', '/hosting/events/101/info'],
    ['/admin/events/101/detail', '/hosting/events/101/detail'],
    ['/admin/events/101/guests', '/hosting/events/101/guests'],
    ['/admin/events/101/qr', '/hosting/events/101/qr'],
    ['/admin/events/101/tickets', '/hosting/events/101/tickets'],
    ['/admin/events/101/tickets/new', '/hosting/events/101/tickets'],
    ['/admin/events/101/options/apply', '/hosting/events/101/tickets'],
    ['/admin/login', '/login'],
  ];
  for (const [from, to] of cases) {
    test(`${from} → ${to} (307)`, async ({ request }) => {
      const res = await request.get(from, { maxRedirects: 0 });
      expect(res.status()).toBe(307);
      expect(res.headers()['location']).toBe(to);
    });
  }

  test('쿼리는 그대로 넘긴다', async ({ request }) => {
    const res = await request.get('/admin?from=v1', { maxRedirects: 0 });
    expect(res.headers()['location']).toBe('/hosting?from=v1');
  });

  test('표에 없는 /admin/kakao/callback은 받지 않는다(404)', async ({ request }) => {
    const res = await request.get('/admin/kakao/callback', { maxRedirects: 0 });
    expect(res.status()).toBe(404);
  });
});
