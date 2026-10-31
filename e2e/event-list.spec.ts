import type { Page } from '@playwright/test';

import { expect, test } from './support/fixtures';

/**
 * 공연 리스트 `/events` 라우트 로직(P5a-L) — 필터의 주소 반영·새로고침·뒤로가기 복구, 없는 태그 처리, 조회 위치.
 * P5a-V(2026-11-01): 태그 칩은 [태그 ▾] 팝오버 안에 있고(GUI `759:11869`), 지난공연은 스위치 "지난공연보기"다 — 선택자만 바꿨다.
 */

const here = (page: Page) => decodeURIComponent(new URL(page.url()).search);
const tagPanel = (page: Page) => page.getByRole('dialog', { name: '태그 고르기' });
const chip = (page: Page, name: string) =>
  tagPanel(page).getByRole('button', { name, exact: true });
/** [태그 ▾]를 눌러 태그 패널을 연다(이미 열려 있으면 그대로) */
async function openTags(page: Page) {
  if (!(await tagPanel(page).isVisible()))
    await page.getByRole('button', { name: /^태그/ }).click();
  await expect(tagPanel(page)).toBeVisible();
}

test.describe('공연 리스트 /events', () => {
  test('서버에서 조회하지 않고 브라우저가 GP-2·GE-11을 읽는다', async ({ page, mockApi }) => {
    const res = await page.goto('/events');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('link', { name: '고스락 제37회 정기공연' })).toBeVisible();
    const browse = mockApi
      .calls()
      .filter((c) => c.path.startsWith('/api/v2/events') || c.path.startsWith('/api/v2/tags'));
    expect(browse.length).toBeGreaterThan(0);
    expect(browse.every((c) => c.from === 'browser')).toBe(true);
  });

  test('주소의 필터로 열면 검색어·태그·지난공연이 복구되고 그 조건으로 조회한다', async ({
    page,
    mockApi,
  }) => {
    await page.goto('/events?keyword=고스락&tagIds=2,1&includePast=true');
    await expect(page.getByRole('searchbox')).toHaveValue('고스락');
    await expect(page.getByRole('switch', { name: '지난공연보기' })).toBeChecked();
    await openTags(page);
    await expect(chip(page, '정기공연')).toHaveAttribute('aria-pressed', 'true');
    await expect(chip(page, '락밴드')).toHaveAttribute('aria-pressed', 'true');
    await expect(chip(page, '서울')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('link', { name: '고스락 제37회 정기공연' })).toBeVisible();
    const list = mockApi.calls().filter((c) => c.path.startsWith('/api/v2/events?'));
    expect(list.map((c) => decodeURIComponent(c.path))).toEqual([
      '/api/v2/events?keyword=고스락&tagIds=1,2&includePast=true&page=0',
    ]);
  });

  test('칩·검색어를 바꾸면 주소에 반영되고, 새로고침과 상세 → 뒤로가기에서 그대로다', async ({
    page,
  }) => {
    await page.goto('/events');
    await openTags(page);
    await chip(page, '락밴드').click();
    await expect.poll(() => here(page)).toBe('?tagIds=2');
    await chip(page, '정기공연').click();
    await expect.poll(() => here(page)).toBe('?tagIds=1,2');
    await page.getByRole('searchbox').fill('고스락');
    await expect.poll(() => here(page)).toBe('?keyword=고스락&tagIds=1,2');

    await page.reload();
    await expect(page.getByRole('searchbox')).toHaveValue('고스락');
    await openTags(page);
    await expect(chip(page, '락밴드')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');

    await page.getByRole('link', { name: '고스락 제37회 정기공연' }).click();
    await expect(page).toHaveURL(/\/events\/101$/);
    await page.goBack();
    await expect.poll(() => here(page)).toBe('?keyword=고스락&tagIds=1,2');
    await expect(page.getByRole('searchbox')).toHaveValue('고스락');
    await openTags(page);
    await expect(chip(page, '정기공연')).toHaveAttribute('aria-pressed', 'true');
  });

  test('필터를 바꿔도 기록이 쌓이지 않는다(뒤로가기는 이전 화면)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('main').getByRole('link', { name: '공연 둘러보기' }).click();
    await expect(page).toHaveURL(/\/events$/);
    await openTags(page);
    await chip(page, '락밴드').click();
    await chip(page, '서울').click();
    await expect.poll(() => here(page)).toBe('?tagIds=2,7');
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
  });

  test('없는 태그(Event_400_23)면 GE-11을 다시 받고 태그 필터를 비운다', async ({
    page,
    mockApi,
  }) => {
    await page.goto('/events?keyword=고스락&tagIds=1,999');
    await expect.poll(() => here(page)).toBe('?keyword=고스락');
    await expect(page.getByRole('link', { name: '고스락 제37회 정기공연' })).toBeVisible();
    await openTags(page);
    await expect(chip(page, '정기공연')).toHaveAttribute('aria-pressed', 'false');
    const calls = mockApi.calls();
    expect(
      calls
        .filter((c) => c.path.startsWith('/api/v2/events?'))
        .map((c) => `${c.status} ${decodeURIComponent(c.path)}`),
    ).toEqual([
      '400 /api/v2/events?keyword=고스락&tagIds=1,999&page=0',
      '200 /api/v2/events?keyword=고스락&page=0',
    ]);
    expect(calls.filter((c) => c.path.startsWith('/api/v2/tags'))).toHaveLength(2);
  });
});
