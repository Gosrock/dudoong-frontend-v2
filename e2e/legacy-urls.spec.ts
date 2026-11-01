import { expect, test } from './support/fixtures';

/**
 * P14 레거시 URL — v1 운영 주소가 v2에서 어디로 가는지(tech-decisions §22 "v1 라우트와 리다이렉트" 표 전수).
 * `/admin/*`(호스트 앱) 줄은 `hosting.spec.ts` "리다이렉트"에 있다. 여기는 관객 앱 줄과 "그대로" 줄이다.
 * 307인 이유와 301 전환 시점은 `next.config.ts` 주석(컷오버 P15에서 정한다).
 */

test.describe('v1 관객 주소 → v2 (307)', () => {
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
