import { expect, test } from './support/fixtures';

/**
 * 약관 경로(tech-decisions §22 — v1과 같은 `/meta/term`·`/meta/privacy`, `next.config.ts` rewrite → `public/*.html`).
 * 파일은 2026-10-25 시행 개정본(v1 Front #355, `release/ticket` `fc3278d`)이다 — legal-copy 머리말.
 */
test.describe('약관 경로', () => {
  for (const [path, title, heading, effective] of [
    [
      '/meta/term',
      '이용약관',
      '두둥 서비스 이용약관',
      '이 약관은 2026년 10월 25일부터 시행합니다.',
    ],
    [
      '/meta/privacy',
      '개인정보 처리방침',
      '두둥 개인정보 처리방침',
      '이 처리방침은 2026년 10월 25일부터 적용됩니다.',
    ],
  ] as const) {
    test(`${path} → 200, 2026-10-25 개정본`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page).toHaveTitle(title);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(page.getByText(effective, { exact: false })).toBeVisible();
    });
  }
});
