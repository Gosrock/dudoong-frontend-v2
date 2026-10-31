import { shellMenu } from '@/features/shared/shell/model/shell-menu';

import { setMockSession } from './support/auth';
import { expect, test } from './support/fixtures';

/**
 * P4s-L 라우트 로직 — 셸 메뉴의 미로그인 항목이 로그인으로 보내고 로그인 뒤 그 항목으로 돌아오는지, 비로그인 `/hosting/**`이
 * 세션 확정 전에 호스팅 쿼리를 보내지 않는지. 셸 마크업은 P4s-V라 메뉴 주소는 `shellMenu(null)`에서 읽는다. 캡처는 없다.
 */

test.describe('셸 메뉴 — 미로그인 항목', () => {
  test('벨(/login?redirect=/mypage/notifications)로 로그인하면 알림함으로 돌아온다', async ({
    page,
  }) => {
    const bell = shellMenu(null).bell;
    expect(bell.href).toBe(`/login?redirect=${encodeURIComponent('/mypage/notifications')}`);
    await setMockSession(page, 'anonymous');
    await page.goto(bell.href);
    await page.getByRole('button', { name: '카카오 로그인/회원가입' }).click();
    await expect(page.getByRole('heading', { name: '가짜 카카오 로그인' })).toBeVisible();
    await page.getByRole('link', { name: '기존 사용자로 로그인', exact: true }).click();
    await expect(page).toHaveURL('/mypage/notifications');
  });

  test('"공연 준비"로 로그인하면 공연준비 홈으로 돌아온다', async ({ page }) => {
    const hosting = shellMenu(null).shortcuts.find((l) => l.key === 'hosting')!;
    await setMockSession(page, 'anonymous');
    await page.goto(hosting.href);
    await page.getByRole('button', { name: '카카오 로그인/회원가입' }).click();
    await page.getByRole('link', { name: '기존 사용자로 로그인', exact: true }).click();
    await expect(page).toHaveURL('/hosting');
  });
});

test.describe('비로그인 /hosting/**', () => {
  for (const path of ['/hosting', '/hosting/new/events', '/hosting/events/140/dashboard']) {
    test(`${path}: 로그인으로 가고, GM-1 말고는 /api를 부르지 않는다`, async ({
      page,
      mockApi,
    }) => {
      await setMockSession(page, 'anonymous');
      await page.goto(path);
      await expect(page).toHaveURL(`/login?redirect=${encodeURIComponent(path)}`);
      const api = mockApi
        .calls()
        .filter((c) => c.path.startsWith('/api/v2/'))
        .map((c) => c.path.split('?')[0]);
      expect([...new Set(api)]).toEqual(['/api/v2/me']);
    });
  }
});
