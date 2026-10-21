import { eventDetailHandlers } from '@/api/__mocks__/event-detail.handlers';
import { MISSING_EVENT_ID } from '@/api/__mocks__/fixtures/event';

import { KAKAO_SCRAP_UA, MOCK_ORIGIN } from './support/env';
import { expect, test } from './support/fixtures';

/**
 * 공연 상세 `/events/[eventId]` 라우트 로직(P5b-L) — 상태 코드·메타 태그·조회 위치만 본다(plan §0 테스트 5).
 * 크롤러 계약은 실제 카카오 UA로 확인한다(tech-decisions §2·§10).
 */

const PREPARING_EVENT_ID = 140;

/** 응답 HTML의 `<head>` 부분 */
const headOf = (html: string) => html.split('</head>')[0] ?? '';
const meta = (head: string, property: string) =>
  new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)"`).exec(head)?.[1] ?? null;

test.describe('공연 상세 — 카카오 크롤러 계약', () => {
  test('실제 카카오 UA로 요청하면 OG(제목·설명·이미지·URL)가 <head>에 있다', async ({
    request,
  }) => {
    const res = await request.get('/events/101', { headers: { 'User-Agent': KAKAO_SCRAP_UA } });
    expect(res.status()).toBe(200);
    const head = headOf(await res.text());
    expect(head).toContain('<title>고스락 제37회 정기공연 | 두둥</title>');
    expect(meta(head, 'og:title')).toBe('고스락 제37회 정기공연');
    expect(meta(head, 'og:description')).toBe(
      '2026.11.21 (토) 19:00 (120분) · 홍대 롤링홀 · 고스락',
    );
    expect(meta(head, 'og:image')).toBe('https://image.mock.dudoong.test/event/101/poster.jpeg');
    expect(meta(head, 'og:url')).toBe(`${MOCK_ORIGIN}/events/101`);
    expect(head).toMatch(new RegExp(`<link rel="canonical" href="${MOCK_ORIGIN}/events/101"`));
  });

  test('주소의 앞 0을 떼어 canonical·og:url을 하나로 맞춘다', async ({ request }) => {
    const res = await request.get('/events/0101', { headers: { 'User-Agent': KAKAO_SCRAP_UA } });
    expect(res.status()).toBe(200);
    expect(meta(headOf(await res.text()), 'og:url')).toBe(`${MOCK_ORIGIN}/events/101`);
  });

  for (const [name, id] of [
    ['없는 공연', MISSING_EVENT_ID],
    ['준비중 공연', PREPARING_EVENT_ID],
  ] as const) {
    test(`${name}은 카카오 크롤러에 404`, async ({ request }) => {
      const res = await request.get(`/events/${id}`, {
        headers: { 'User-Agent': KAKAO_SCRAP_UA },
      });
      expect(res.status()).toBe(404);
      expect(meta(headOf(await res.text()), 'og:title')).toBeNull();
    });
  }

  test('숫자가 아닌 id는 백엔드를 부르지 않고 404', async ({ request, mockApi }) => {
    const res = await request.get('/events/abc', { headers: { 'User-Agent': KAKAO_SCRAP_UA } });
    expect(res.status()).toBe(404);
    expect(mockApi.calls()).toEqual([]);
  });

  test('GP-3이 5xx면 카카오 크롤러는 500을 받는다', async ({ request, mockApi }) => {
    mockApi.use(...eventDetailHandlers.detailServerError(101));
    const res = await request.get('/events/101', { headers: { 'User-Agent': KAKAO_SCRAP_UA } });
    expect(res.status()).toBe(500);
  });

  test('GE-5가 5xx여도 카카오 크롤러는 500을 받는다', async ({ request, mockApi }) => {
    mockApi.use(...eventDetailHandlers.sectionsServerError(101));
    const res = await request.get('/events/101', { headers: { 'User-Agent': KAKAO_SCRAP_UA } });
    expect(res.status()).toBe(500);
  });
});

test.describe('공연 상세 — 브라우저', () => {
  test('서버가 GP-3·GE-5를 조회해 그리고, 브라우저는 다시 조회하지 않으며 재고(GP-5)는 서버에서 부르지 않는다', async ({
    page,
    mockApi,
  }) => {
    const res = await page.goto('/events/101');
    expect(res?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { level: 1, name: '고스락 제37회 정기공연' }),
    ).toBeVisible();
    await expect(page.getByText('2026.11.21 (토) 19:00 (120분)')).toBeVisible();
    await expect(page.getByRole('heading', { name: '세트리스트' })).toBeVisible();

    const calls = mockApi.calls();
    const detail = calls.filter((c) => c.path === '/api/v2/events/101');
    const sections = calls.filter((c) => c.path === '/api/v2/events/101/sections');
    // generateMetadata와 페이지가 같은 요청 QueryClient를 써서 한 번만 부른다
    expect(detail.map((c) => c.from)).toEqual(['server']);
    expect(sections.map((c) => c.from)).toEqual(['server']);
    expect(calls.filter((c) => c.path.includes('/ticket-items') && c.from === 'server')).toEqual(
      [],
    );
  });

  test('응답 HTML에 재고 값이 없다', async ({ request, mockApi }) => {
    const res = await request.get('/events/101');
    expect(res.status()).toBe(200);
    const html = await res.text();
    // fixture 101의 티켓: 잔여 42 · 매진 · 1인 제한 4
    expect(html).not.toMatch(/remaining|isSoldOut|isPurchasable|purchaseLimit|ticketItemId/);
    expect(html).not.toMatch(/잔여|매진/);
    expect(mockApi.calls().filter((c) => c.path.includes('/ticket-items'))).toEqual([]);
  });

  test('없는 공연은 not-found 화면(noindex)', async ({ page }) => {
    const res = await page.goto(`/events/${MISSING_EVENT_ID}`);
    // 켠 구성에서 브라우저 UA는 200 + not-found 화면이다(tech-decisions §2·§26). 크롤러는 404(위)
    expect([200, 404]).toContain(res?.status());
    await expect(page.getByText('This page could not be found.')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('섹션 10개짜리 공연을 모두 그린다', async ({ page, mockApi }) => {
    mockApi.use(...eventDetailHandlers.tenSections(101));
    await page.goto('/events/101');
    for (let i = 1; i <= 10; i++) {
      await expect(page.getByRole('heading', { name: `섹션 ${i}`, exact: true })).toBeVisible();
    }
  });

  test('섹션 본문의 XSS 페이로드는 서버 렌더와 하이드레이션 어디서도 실행되지 않는다', async ({
    page,
    mockApi,
  }) => {
    mockApi.use(...eventDetailHandlers.xssSection(101));
    const res = await page.goto('/events/101');
    const html = (await res?.text()) ?? '';
    // 서버가 그린 본문(<main>). 원본 응답은 하이드레이션 데이터(JSON 문자열)에 그대로 실려 있지만 실행되지 않는다
    const main = /<main>[\s\S]*<\/main>/.exec(html)?.[0] ?? '';
    expect(main).toContain('안전한 글');
    expect(main).not.toMatch(/onerror|<script|__xss/);
    await expect(page.getByText('안전한 글')).toBeVisible();
    expect(await page.evaluate(() => (window as { __xss?: unknown }).__xss)).toBeUndefined();
    await expect(page.locator('main [onerror], main script')).toHaveCount(0);
  });

  test('서버 섹션이 없는 공연은 기본 4탭 빈 상태', async ({ page, mockApi }) => {
    mockApi.use(...eventDetailHandlers.noSections(103));
    await page.goto('/events/103');
    for (const title of ['공연소개', '예매안내', '세트리스트', '유의사항']) {
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    }
    await expect(page.getByText('아직 등록된 내용이 없어요')).toHaveCount(4);
  });
});
