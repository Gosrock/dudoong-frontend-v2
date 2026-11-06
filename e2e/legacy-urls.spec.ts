import { expect, test } from './support/fixtures';

/**
 * P14 레거시 URL — v1 운영 주소가 v2에서 어디로 가는지(tech-decisions §22 "v1 라우트와 리다이렉트" 표 전수).
 * `/admin/*`(호스트 앱) 줄은 `hosting.spec.ts` "리다이렉트"에 있다. 여기는 관객 앱 줄과 "그대로" 줄이다.
 * 임시(307)로 시작하는 이유는 `next.config.ts` 주석(백엔드 #939 답 2026-11-06 — 컷오버 뒤 안정되면 308).
 */

test.describe('v1 관객 주소 → v2 (307 임시 — 컷오버 뒤 308)', () => {
  const cases: [string, string][] = [
    ['/home', '/'],
    ['/events/101/book/option', '/events/101'],
    ['/events/101/book/order', '/events/101'],
    ['/pay/confirm', '/orders'],
    ['/pay/success', '/orders'],
    ['/pay/fail', '/orders'],
    ['/history', '/orders'],
    ['/history/mycoupon', '/mypage'],
    ['/history/mock-order-tickets-a', '/orders/mock-order-tickets-a'],
    ['/ticket', '/tickets'],
    ['/ticket/mock-order-tickets-a', '/tickets'],
    ['/ticket/qr', '/tickets'],
  ];
  for (const [from, to] of cases) {
    test(`${from} → ${to}`, async ({ request }) => {
      const res = await request.get(from, { maxRedirects: 0 });
      expect(res.status()).toBe(307);
      expect(res.headers()['location']).toBe(to);
    });
  }

  test('쿼리는 그대로 넘긴다(공유 링크의 utm 등)', async ({ request }) => {
    const res = await request.get('/events/101/book/option?utm_source=kakao', {
      maxRedirects: 0,
    });
    expect(res.headers()['location']).toBe('/events/101?utm_source=kakao');
  });

  test('카카오로 유통된 공연 상세 v1 예매 단계 주소를 따라가면 상세가 200', async ({ request }) => {
    const res = await request.get('/events/101/book/order');
    expect(res.status()).toBe(200);
    expect(res.url()).toMatch(/\/events\/101$/);
  });

  test('표에 없는 v1 예매 단계는 받지 않는다(404)', async ({ request }) => {
    const res = await request.get('/events/101/book/unknown', { maxRedirects: 0 });
    expect(res.status()).toBe(404);
  });
});

test.describe('v1과 같은 주소는 리다이렉트 없이 그대로', () => {
  const same = [
    '/',
    '/events/101',
    '/mypage',
    '/login',
    '/login/expired',
    '/kakao/callback',
    '/meta/term',
    '/meta/privacy',
  ];
  for (const path of same) {
    test(`${path} 200`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status()).toBe(200);
    });
  }
});

test.describe('짐작 주소 → v2 (307 임시)', () => {
  // 스테이징 QA #106 §2 — 알림함은 `/mypage/notifications`. v1에 없던 주소라 기억시키지 않는다(next.config.ts)
  test('/notifications → /mypage/notifications', async ({ request }) => {
    const res = await request.get('/notifications', { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers()['location']).toBe('/mypage/notifications');
  });
});

test.describe('v2 새 주소 — 리다이렉트 규칙에 걸리지 않는다', () => {
  // 호스트 초대 링크(B33② · 백엔드 #933). 메일 · 메신저로 유통되는 주소라 리다이렉트로 토큰이 다른 곳(Location)에 실리면 안 된다
  for (const path of [
    '/host-invitations/mock-invite-valid-Q2hvb3NlIHRoZSBzb3VuZA',
    '/host-invitations',
  ]) {
    test(`${path.replace(/mock-invite-[\w-]+/, '{token}')} 200`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status()).toBe(200);
      expect(res.headers()['location']).toBeUndefined();
    });
  }
});
