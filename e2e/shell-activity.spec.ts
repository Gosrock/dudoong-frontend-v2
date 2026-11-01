import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { resetHostingStore } from '@/api/__mocks__/hosting.handlers';

import { setMockSession } from './support/auth';
import { goEventMenu } from './support/event-scope';
import { expect, test } from './support/fixtures';

/**
 * fix-qa-1101 — 클라이언트 이동 뒤 셸 판정. Next 16은 이동할 때 이전 페이지를 React `<Activity>`로 숨겨 DOM에 남긴다.
 * 셸이 `:has([표시])`로 "지금 화면"을 판정하므로 숨은 페이지의 표시가 남아 계속 맞던 문제(새로고침하면 정상).
 * 새로고침으로 연 같은 화면과 모양이 같은지를 본다(`useActivityMarker` — patterns §6).
 */
const resetStores = () => {
  resetHostMockState();
  resetHostingStore();
};
test.beforeEach(resetStores);
test.afterEach(resetStores);

test('공연 스코프 → "내 공연"(클라이언트 이동): 본문 폭 제한·여백과 모바일 로고 헤더가 돌아온다', async ({
  page,
}) => {
  await setMockSession(page, 'loggedIn');
  await page.goto('/hosting');
  const main = page.getByRole('main');
  await expect(main).toBeVisible();
  const fresh = (await main.boundingBox())!;
  const logoMenu = page.getByRole('button', { name: '메뉴 열기' });
  const logoHeaderVisible = await logoMenu.isVisible();

  await page.goto('/hosting/events/140/dashboard');
  await goEventMenu(page, '내 공연');
  await expect(page).toHaveURL('/hosting');
  // 숨은 공연 화면이 DOM에 남아 있다(이 테스트의 전제)
  await expect(page.locator('[data-event-scope]')).toHaveCount(1);
  await expect(main).toBeVisible();
  const after = (await main.boundingBox())!;
  expect(after.x).toBe(fresh.x);
  expect(after.width).toBe(fresh.width);
  await expect(logoMenu).toBeVisible({ visible: logoHeaderVisible });
});

test('하위 헤더 화면(공지) → 뒤로(클라이언트 이동): 모바일 로고 헤더가 다시 보인다', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', '로고 헤더·하위 헤더는 1024 미만에서만 보인다');
  await page.goto('/');
  const logoMenu = page.getByRole('button', { name: '메뉴 열기' });
  await expect(logoMenu).toBeVisible();

  await logoMenu.click();
  await page.getByRole('dialog').getByRole('link', { name: '서비스 업데이트 노트' }).click();
  await expect(page).toHaveURL('/notices');
  await expect(logoMenu).toBeHidden();

  await page.getByRole('button', { name: '뒤로 가기' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('[data-shell-subheader]')).toHaveCount(1);
  await expect(logoMenu).toBeVisible();
});

test('공연 리스트(/events) → 공연 상세(클라이언트 이동): 헤더 검색 아이콘이 다시 보인다', async ({
  page,
}) => {
  await page.goto('/events');
  const search = page.getByRole('link', { name: '공연 검색' });
  await expect(page.getByRole('link', { name: '고스락 제37회 정기공연' })).toBeVisible();
  await expect(search).toHaveCount(0);

  await page.getByRole('link', { name: '고스락 제37회 정기공연' }).click();
  await expect(page).toHaveURL(/\/events\/\d+$/);
  await expect(page.locator('[data-shell-no-search]')).toHaveCount(1);
  await expect(search).toBeVisible();
});
