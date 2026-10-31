import { expect, test } from './support/fixtures';

/**
 * 약관 경로(tech-decisions §22 — v1과 같은 `/meta/term`·`/meta/privacy`, `next.config.ts` rewrite → `public/*.html`).
 * 파일은 v1 운영본을 그대로 옮긴 것이다 — v1-additions L-1.
 * - 이용약관: 2026-10-25 시행 개정본(v1 Front #355 + #379) + 일부 개정(Front #385 — 제19조②·제27조③·제29조③1호, 2026-11-07 시행).
 *   #385는 **머지 전 PR**(head `706b561`)의 파일이다. 부칙 제1조가 ①②로 나뉘었다.
 * - 처리방침: 2026-10-25 시행 개정본(#355 + #382, `release/ticket` `9d09938`).
 */
test.describe('약관 경로', () => {
  for (const [path, title, heading, effective] of [
    [
      '/meta/term',
      '이용약관',
      '두둥 서비스 이용약관',
      [
        '이 약관은 2026년 10월 25일부터 시행합니다.',
        '2026년 10월 31일 개정한 제19조제2항, 제27조제3항, 제29조제3항제1호는 2026년 11월 7일부터 시행합니다.',
      ],
    ],
    [
      '/meta/privacy',
      '개인정보 처리방침',
      '두둥 개인정보 처리방침',
      ['이 처리방침은 2026년 10월 25일부터 적용됩니다.'],
    ],
  ] as const) {
    test(`${path} → 200, 시행일 문장`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page).toHaveTitle(title);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      for (const sentence of effective) {
        await expect(page.getByText(sentence, { exact: false })).toBeVisible();
      }
    });
  }
});
