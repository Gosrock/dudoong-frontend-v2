import { eventBrowseSets } from '@/api/__mocks__/event.handlers';
import { events } from '@/api/__mocks__/fixtures/event';

import { MOCK_ORIGIN } from './support/env';
import { expect, test } from './support/fixtures';

/**
 * 검색·AI 노출 기반(이슈 #8) — `robots.txt`, `sitemap.xml`, 공연 상세 JSON-LD. 크롤러는 JS를 실행하지 않으므로
 * 브라우저 없이 응답 본문만 본다.
 */

/** 가짜 GP-2 `includePast=false`가 돌려주는 공연(종료 전 OPEN — 진행 중 + 시작 전) */
const upcoming = events.filter(
  (e) => e.status !== 'PREPARING' && e.status !== 'DELETED' && e.displayStatus !== 'PAST',
);
const hidden = events.filter((e) => !upcoming.includes(e));

const PRIVATE_PATHS = [
  '/hosting',
  '/mypage',
  '/orders',
  '/tickets',
  '/check-in',
  '/gate-check',
  '/kakao',
  '/login',
  '/gifts',
];

test.describe('robots.txt', () => {
  test('공개 경로를 허용하고 로그인 뒤 경로를 막으며, AI 크롤러에도 같은 규칙과 sitemap 주소를 준다', async ({
    request,
  }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const body = await res.text();
    const groups = body.split(/\n\s*\n/).filter((g) => g.includes('User-Agent'));
    const star = groups.find((g) => g.includes('User-Agent: *'))!;
    const ai = groups.find((g) => g.includes('User-Agent: GPTBot'))!;
    for (const bot of ['OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended']) {
      expect(ai).toContain(`User-Agent: ${bot}`);
    }
    for (const group of [star, ai]) {
      for (const path of ['/', '/events/', '/hosts/', '/notices/']) {
        expect(group).toContain(`Allow: ${path}\n`);
      }
      for (const path of PRIVATE_PATHS) expect(group).toContain(`Disallow: ${path}\n`);
    }
    expect(body).toContain(`Sitemap: ${MOCK_ORIGIN}/sitemap.xml`);
  });
});

test.describe('sitemap.xml', () => {
  test('종료 전 공연 상세와 그 호스트 홈을 넣고, 지난·준비중 공연과 막는 경로는 넣지 않는다', async ({
    request,
  }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const locs = [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
    const paths = locs.map((l) => l.replace(MOCK_ORIGIN, ''));

    expect(locs.every((l) => l.startsWith(`${MOCK_ORIGIN}/`))).toBe(true);
    expect(paths).toContain('/');
    expect(upcoming.length).toBeGreaterThan(0);
    for (const e of upcoming) expect(paths).toContain(`/events/${e.eventId}`);
    for (const e of hidden) expect(paths).not.toContain(`/events/${e.eventId}`);
    const hostIds = [...new Set(upcoming.map((e) => e.host.hostId))];
    expect(paths.filter((p) => p.startsWith('/hosts/')).sort()).toEqual(
      hostIds.map((id) => `/hosts/${id}`).sort(),
    );
    for (const p of PRIVATE_PATHS) expect(paths.some((x) => x.startsWith(p))).toBe(false);
    // 수정일 필드가 없어 넣지 않는다
    expect(await res.text()).not.toContain('<lastmod>');
  });

  test('GP-2가 5xx면 빈 sitemap 대신 500', async ({ request, mockApi }) => {
    mockApi.use(...eventBrowseSets.listServerError);
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(500);
  });
});

test.describe('공연 상세 JSON-LD', () => {
  test('JS 없는 응답 HTML에 schema.org/Event가 있고 가격·재고는 없다', async ({ request }) => {
    const res = await request.get('/events/101');
    expect(res.status()).toBe(200);
    const html = await res.text();
    const raw = /<script type="application\/ld\+json">([^<]*)<\/script>/.exec(html)?.[1];
    expect(raw).toBeDefined();
    const ld = JSON.parse(raw!);
    expect(ld).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: '고스락 제37회 정기공연',
      startDate: '2026-11-21T19:00:00+09:00',
      endDate: '2026-11-21T21:00:00+09:00',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      location: { '@type': 'Place', name: '홍대 롤링홀' },
      image: ['https://image.mock.dudoong.test/event/101/poster.jpeg'],
      organizer: { '@type': 'Organization', name: '고스락', url: `${MOCK_ORIGIN}/hosts/11` },
      url: `${MOCK_ORIGIN}/events/101`,
    });
    expect(ld).not.toHaveProperty('offers');
  });
});
