import type { Page } from '@playwright/test';
import { http } from 'msw';

import { eventDetailHandlers } from '@/api/__mocks__/event-detail.handlers';
import { MISSING_EVENT_ID } from '@/api/__mocks__/fixtures/event';

import { setMockSession } from './support/auth';
import { KAKAO_SCRAP_UA, MOCK_ORIGIN } from './support/env';
import { expect, test } from './support/fixtures';
import type { MockBackend } from './support/mock-backend';

/**
 * 공연 상세 `/events/[eventId]` 라우트 로직(P5b-L) — 상태 코드·메타 태그·조회 위치만 본다(plan §0 테스트 5).
 * 크롤러 계약은 실제 카카오 UA로 확인한다(tech-decisions §2·§10).
 */

const PREPARING_EVENT_ID = 140;

/** 공연 상세 섹션 탭(P5b-V — 섹션은 제목이 아니라 탭으로 그린다) */
const sectionTab = (page: Page, title: string) =>
  page.getByRole('tablist', { name: '공연 안내' }).getByRole('tab', { name: title, exact: true });

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

  // 셸을 먼저 흘려보내는 Cache Components에서 404를 받는 것은 `htmlLimitedBots`에 걸린 UA뿐이다(이슈 #90 —
  // src/utils/html-limited-bots.ts). Next 기본 목록에 없던 Googlebot·줄인 카카오 UA·다음도 404여야 한다
  for (const ua of [
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'kakaotalk-scrap/1.0',
    'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)',
    'Mozilla/5.0 (compatible; Daum/4.1; +http://cs.daum.net/faq/15/4118.html?faqId=28966) Daumoa',
  ]) {
    test(`없는 공연은 검색·미리보기 크롤러에 404 — ${ua}`, async ({ request }) => {
      const res = await request.get(`/events/${MISSING_EVENT_ID}`, {
        headers: { 'User-Agent': ua },
      });
      expect(res.status()).toBe(404);
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
    // 일시는 모바일 아이콘 행(한 줄)·PC 정보 표(일자) 중 화면 크기에 맞는 하나만 보인다(같은 DOM, CSS — patterns §1)
    await expect(page.getByText(/^2026\.11\.21 \(토\)/).filter({ visible: true })).toHaveCount(1);
    // 섹션은 탭으로 그린다(P5b-V)
    await expect(sectionTab(page, '세트리스트')).toBeVisible();

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

  test('포스터는 칸에 맞춰 줄이고 자르지 않는다(contain — 이슈 #93 §1)', async ({ page }) => {
    // 가짜 이미지 출처는 응답이 없다 — 1×1 PNG로 채워 포스터가 그려지게 한다
    await page.route('https://image.mock.dudoong.test/**', (route) =>
      route.fulfill({
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          'base64',
        ),
      }),
    );
    await page.goto('/events/101');
    const poster = page.getByRole('img', { name: '고스락 제37회 정기공연 포스터' });
    await expect(poster).toBeVisible();
    expect(await poster.evaluate((el) => getComputedStyle(el).objectFit)).toBe('contain');
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
    // 셸 안의 공용 404(P4s-V `(audience)/not-found.tsx`)
    await expect(page.getByText('찾을 수 없어요')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('섹션 10개짜리 공연을 모두 그린다', async ({ page, mockApi }) => {
    mockApi.use(...eventDetailHandlers.tenSections(101));
    await page.goto('/events/101');
    await expect(page.getByRole('tablist', { name: '공연 안내' }).getByRole('tab')).toHaveCount(10);
    // 탭마다 눌러 본문(v1 실데이터 — HTML·마크다운 번갈아)이 그려지는지 본다
    for (let i = 1; i <= 10; i++) {
      await sectionTab(page, `섹션 ${i}`).click();
      const panel = page.getByRole('tabpanel', { name: `섹션 ${i}`, exact: true });
      await expect(panel).toBeVisible();
      await expect(panel).not.toHaveText('');
      await expect(panel.getByText('아직 등록된 내용이 없어요')).toHaveCount(0);
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
    const main = /<main[\s>][\s\S]*<\/main>/.exec(html)?.[0] ?? '';
    expect(main).toContain('안전한 글');
    expect(main).not.toMatch(/onerror|<script|__xss/);
    await expect(page.getByText('안전한 글')).toBeVisible();
    expect(await page.evaluate(() => (window as { __xss?: unknown }).__xss)).toBeUndefined();
    await expect(page.locator('main [onerror], main script')).toHaveCount(0);
  });

  test('서버 섹션이 없는 공연은 기본 4탭 빈 상태', async ({ page, mockApi }) => {
    mockApi.use(...eventDetailHandlers.noSections(103));
    await page.goto('/events/103');
    const tabs = page.getByRole('tablist', { name: '공연 안내' }).getByRole('tab');
    await expect(tabs).toHaveText(['공연소개', '예매안내', '세트리스트', '유의사항']);
    // 탭마다 빈 상태(탭 본문은 고른 탭 하나만 그린다)
    for (const title of ['공연소개', '예매안내', '세트리스트', '유의사항']) {
      await sectionTab(page, title).click();
      await expect(
        page
          .getByRole('tabpanel', { name: title, exact: true })
          .getByText('아직 등록된 내용이 없어요'),
      ).toBeVisible();
    }
  });
});

/**
 * 문의처는 사용자별 값이다(백엔드 #822/#846 — 비로그인 GP-3은 전화·이메일을 가린다). 서버 조회는 그대로 토큰 없이 두고,
 * 로그인 사용자가 연락처를 열 때만 브라우저가 GP-3을 쿠키와 함께 다시 읽는다(A안). fixture 101: 전화 `010-1234-5678`.
 */
test.describe('공연 상세 — 문의처(사용자별 값)', () => {
  /** GP-3 요청마다 출처·쿠키 유무를 남긴다(응답은 기본 핸들러) */
  function spyDetail(mockApi: MockBackend) {
    const seen: { from: string; cookie: boolean }[] = [];
    mockApi.use(
      http.get('*/api/v2/events/101', ({ request }) => {
        seen.push({
          from: request.headers.get('user-agent')?.startsWith('Mozilla/') ? 'browser' : 'server',
          cookie: (request.headers.get('cookie') ?? '').includes('accessToken='),
        });
        return undefined;
      }),
    );
    return seen;
  }

  test('로그인 사용자가 연락처를 열면 원문(전화 링크)이 보이고, 서버 조회에는 여전히 토큰이 없다', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    const seen = spyDetail(mockApi);
    const res = await page.goto('/events/101');
    expect(res?.status()).toBe(200);
    // 응답 HTML(서버 렌더 + 하이드레이션 데이터)에는 원문이 없다
    expect(await res?.text()).not.toContain('010-1234-5678');
    // 문의 입구: 모바일 하단 바 아이콘 버튼 · PC 호스트 옆 버튼 — 화면 크기에 맞는 하나만 보인다
    const open = page.getByRole('button', { name: '문의하기' });
    await expect(open).toBeVisible();
    // 열기 전에는 브라우저가 GP-3을 부르지 않는다
    expect(seen).toEqual([{ from: 'server', cookie: false }]);

    await open.click();
    const contacts = page.getByRole('list', { name: '연락처' });
    await expect(contacts.getByRole('link', { name: /010-1234-5678/ })).toHaveAttribute(
      'href',
      'tel:01012345678',
    );
    expect(seen).toEqual([
      { from: 'server', cookie: false },
      { from: 'browser', cookie: true },
    ]);
  });

  test('비로그인은 연락처를 열어도 다시 조회하지 않고 가린 전화를 링크 없이 보여 준다', async ({
    page,
    mockApi,
  }) => {
    const seen = spyDetail(mockApi);
    await page.goto('/events/101');
    await page.getByRole('button', { name: '문의하기' }).click();
    const contacts = page.getByRole('list', { name: '연락처' });
    // 행 = 유형 라벨 + 값(와이어 121:2026)
    const phone = contacts.getByRole('listitem').filter({ hasText: '010-****-5678' });
    await expect(phone).toContainText('전화');
    await expect(contacts.getByRole('link', { name: /\*/ })).toHaveCount(0);
    expect(seen).toEqual([{ from: 'server', cookie: false }]);
  });
});
