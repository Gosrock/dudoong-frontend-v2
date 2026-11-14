import { APP_ORIGIN } from './support/env';
import { expect, test } from './support/fixtures';

/**
 * 앱 응답 헤더 크기(implementation-log "응답 헤더 크기(2026-11-14)"). nginx는 업스트림 헤더를 `proxy_buffer_size`(기본 4k)에
 * 담는데, 공연 상세가 CSS preload 30여 개를 `Link` 헤더에 실어 스테이징에서 502였다. `reactMaxHeadersLength`(next.config.ts)가
 * `Link`를 자른다. nginx가 붙이는 헤더 몫을 남기려고 앱 헤더 전체를 2KB 아래로 본다.
 * 브라우저가 아니라 Next 서버에 바로 묻는다 — nginx가 받는 것이 이것이다.
 */
const MAX_HEADER_BYTES = 2048;
const MAX_LINK_LENGTH = 800;

const ROUTES = [
  '/',
  '/events',
  '/events/101',
  '/events/999999',
  '/events/101/checkout',
  '/tickets',
  '/hosting/events/101/dashboard',
];

test.describe('응답 헤더 크기', () => {
  for (const path of ROUTES) {
    test(`${path} — 헤더 ${MAX_HEADER_BYTES}바이트 아래 · Link ${MAX_LINK_LENGTH}자 이하`, async ({
      request,
    }) => {
      const res = await request.get(`${APP_ORIGIN}${path}`, { maxRedirects: 0 });
      const headers = res.headersArray();
      const bytes =
        `HTTP/1.1 ${res.status()} ${res.statusText()}\r\n`.length +
        headers.reduce((sum, h) => sum + Buffer.byteLength(`${h.name}: ${h.value}\r\n`), 0);
      expect(bytes, headers.map((h) => `${h.name}: ${h.value.length}`).join(', ')).toBeLessThan(
        MAX_HEADER_BYTES,
      );
      const link = headers.find((h) => h.name.toLowerCase() === 'link')?.value ?? '';
      expect(link.length).toBeLessThanOrEqual(MAX_LINK_LENGTH);
    });
  }
});
