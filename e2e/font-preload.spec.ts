import { expect, test } from './support/fixtures';

/**
 * 카트라이더체(1.4MB OTF) 미리 받기 — 공연 카드가 있는 라우트만(`src/ui/theme/KartriderPreload.tsx`, design-system §1).
 * HTML `<head>`의 `<link rel="preload" as="font">`를 본다. 정적 라우트(`/events`)는 같은 것을 응답 `Link` 헤더로도 보낸다.
 */

/** 응답 HTML `<head>` 안의 otf preload href */
function headOtfPreloads(html: string) {
  const head = html.slice(0, html.indexOf('</head>'));
  return [...head.matchAll(/<link[^>]*rel="preload"[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => tag.includes('as="font"') && tag.includes('.otf'))
    .map((tag) => /href="([^"]+)"/.exec(tag)?.[1] ?? '');
}

/** 응답 `Link` 헤더의 otf preload */
function headerOtfPreloads(link: string | undefined) {
  return (link ?? '').split(',').filter((v) => v.includes('.otf') && v.includes('rel=preload'));
}

const CARD_ROUTES = [
  { path: '/', card: '고스락 제37회 정기공연' },
  { path: '/events', card: '고스락 제37회 정기공연' },
  { path: '/hosts/11', card: null },
];

test.describe('카트라이더체 preload', () => {
  for (const { path, card } of CARD_ROUTES) {
    test(`${path} — otf preload 하나, @font-face가 받는 파일과 같은 URL`, async ({ page }) => {
      const res = await page.goto(path);
      const preloads = headOtfPreloads((await res?.text()) ?? '');
      expect(preloads).toHaveLength(1);

      if (card) await expect(page.getByRole('link', { name: card }).first()).toBeVisible();
      // @font-face의 src가 preload와 같은 파일이어야 미리 받은 것을 다시 쓴다(두 벌 받지 않음)
      const faceUrls = await page.evaluate(() =>
        [...document.styleSheets].flatMap((sheet) => {
          try {
            return [...sheet.cssRules]
              .filter((r): r is CSSFontFaceRule => r instanceof CSSFontFaceRule)
              .filter((r) => r.style.getPropertyValue('font-family').includes('kartrider'))
              .map((r) => {
                const src = /url\("?([^")]+)"?\)/.exec(r.style.getPropertyValue('src'))?.[1] ?? '';
                return new URL(src, sheet.href ?? location.href).pathname;
              });
          } catch {
            return [];
          }
        }),
      );
      expect(faceUrls).toEqual([new URL(preloads[0]!, 'http://x').pathname]);
    });
  }

  for (const { path } of CARD_ROUTES) {
    test(`${path} — 카트라이더체를 한 번만 받고 loaded가 된다`, async ({ page }) => {
      const otf: string[] = [];
      page.on('request', (r) => {
        if (r.url().endsWith('.otf')) otf.push(r.url());
      });
      await page.goto(path);
      await expect
        .poll(() =>
          page.evaluate(() =>
            [...document.fonts].some(
              (f) => f.family.includes('kartrider') && f.status === 'loaded',
            ),
          ),
        )
        .toBe(true);
      await page.waitForLoadState('networkidle');
      expect(otf).toHaveLength(1);
    });
  }

  for (const path of ['/notices', '/tickets', '/login']) {
    test(`${path} — 카드가 없으면 미리 받지 않고 otf를 요청하지 않는다`, async ({ page }) => {
      const otf: string[] = [];
      page.on('request', (r) => {
        if (r.url().endsWith('.otf')) otf.push(r.url());
      });
      const res = await page.goto(path);
      expect(headOtfPreloads((await res?.text()) ?? '')).toEqual([]);
      expect(headerOtfPreloads(res?.headers()['link'])).toEqual([]);
      // 셸 링크가 `/` · `/events`를 prefetch해도 그 응답 때문에 받기 시작하지 않는다
      await page.waitForLoadState('networkidle');
      expect(otf).toEqual([]);
    });
  }
});
