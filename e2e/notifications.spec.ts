import type { Page } from '@playwright/test';

import { NEW_APPROVED_ORDER_UUID, resetTicketStore } from '@/api/__mocks__/fixtures/my-ticket';
import { resetNotificationStore } from '@/api/__mocks__/fixtures/notification';

import { setMockSession } from './support/auth';
import { expect, test } from './support/fixtures';

/**
 * P9b-L 라우트 로직 — 알림함 `/mypage/notifications`(보호, 브라우저 조회)와 알림을 누른 뒤의 이동.
 * GUI #375 · #376(2026-11-22): 관객 / 호스트 창(`?tab=host`), 창을 열면 그 창의 새 알림을 PN-3로 읽는다.
 * 화면 모양(아이콘·빨간 점·상대 시간)은 보지 않는다(V — QA `notifications`).
 * 호스트가 받은 주문 알림의 `?order=` 진입(예매자 관리 주문 상세가 열린 상태)은 P13a-L과 나눈다 — 여기서는 링크 주소만 본다.
 */
test.beforeEach(() => {
  resetTicketStore();
  resetNotificationStore();
});

const PATH = '/mypage/notifications';
const row = (page: Page, text: string) =>
  page.getByTestId('notification').filter({ hasText: text }).first();
const readDone = (page: Page) =>
  page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().endsWith('/me/notifications/read'),
  );
const readRequest = (page: Page) =>
  page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/me/notifications/read'));

test.describe('알림함', () => {
  test('비로그인이면 로그인으로 가고 돌아올 곳은 알림함', async ({ page }) => {
    await setMockSession(page, 'anonymous');
    await page.goto(PATH);
    await expect(page).toHaveURL(`/login?redirect=${encodeURIComponent(PATH)}`);
  });

  test('로그인하면 200, GN-1은 브라우저에서만 첫 페이지부터 — 관객 창은 호스트 알림 5건을 빼고 15건', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    const res = await page.goto(PATH);
    expect(res?.status()).toBe(200);
    await expect(page.getByTestId('notification')).toHaveCount(15);
    await expect(page.locator('[data-testid=notification][data-tab=host]')).toHaveCount(0);
    const lists = mockApi.calls().filter((c) => c.path.startsWith('/api/v2/me/notifications?'));
    expect(lists.map((c) => [c.from, c.path])).toEqual([
      ['browser', '/api/v2/me/notifications?page=0'],
    ]);
  });

  test('관객 창을 열면 그 창의 안 읽은 알림만 PN-3 notificationIds로 읽고, 티켓탭 공지 바가 풀린다', async ({
    page,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/tickets');
    await expect(page.getByRole('status')).toContainText('NEW 티켓 주문이 승인되었습니다!');

    const read = readRequest(page);
    const done = readDone(page);
    await page.goto(PATH);
    // 승인 125 · 곧 시작 124 · 선물 도착 123 · 모르는 타입 120 — 호스트 창 새 주문(122)은 빼고
    expect((await read).postDataJSON()).toEqual({ notificationIds: [125, 124, 123, 120] });
    await expect(row(page, '주문이 승인되어 티켓이 발급되었어요')).toHaveAttribute(
      'data-read',
      'true',
    );
    await done;

    await page.goto('/tickets');
    await expect(page.getByTestId('ticket-group').first()).toBeVisible();
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('승인 알림을 누르면 주문상세로 간다', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(PATH);
    await row(page, '주문이 승인되어 티켓이 발급되었어요').getByRole('link').click();
    await expect(page).toHaveURL(`/orders/${NEW_APPROVED_ORDER_UUID}`);
  });

  test('target.type별 이동 — EVENT → 공연 상세, GIFT → 티켓탭, HOST → 호스트 홈(호스트 창)', async ({
    page,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(PATH);
    await row(page, '공연이 1시간 뒤에 시작됩니다!').getByRole('link').click();
    await expect(page).toHaveURL('/events/101');

    await page.goto(PATH);
    await row(page, '님에게 받은').getByRole('link').click();
    await expect(page).toHaveURL('/tickets');

    await page.goto(`${PATH}?tab=host`);
    await row(page, '매니저(으)로 추가되었습니다').getByRole('link').click();
    await expect(page).toHaveURL('/hosts/11');
  });

  test('호스트 창(?tab=host)은 호스트 알림 5건, 열면 새 주문을 PN-3로 읽고 주문 알림은 예매자 관리 ?order= 링크', async ({
    page,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(PATH);
    await expect(page.getByTestId('notification')).toHaveCount(15);
    const read = readRequest(page);
    await page.getByRole('tab', { name: /^호스트/ }).click();
    await expect(page).toHaveURL(`${PATH}?tab=host`);
    expect((await read).postDataJSON()).toEqual({ notificationIds: [122] });
    await expect(page.getByTestId('notification')).toHaveCount(5);
    await expect(row(page, '주문(R3000101)이 접수되었습니다').getByRole('link')).toHaveAttribute(
      'href',
      '/hosting/events/101/guests?order=mock-host-order-1',
    );
  });

  test('두 창을 다 보면 다시 들어와도 모두 읽음', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(PATH);
    await expect(page.getByTestId('notification')).toHaveCount(15);
    const done = readDone(page);
    await page.getByRole('tab', { name: /^호스트/ }).click();
    await done;
    await page.goto(PATH);
    await expect(page.getByTestId('notification')).toHaveCount(15);
    await expect(page.locator('[data-testid="notification"][data-read="false"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="notification"][data-new="true"]')).toHaveCount(0);
    await page.goto(`${PATH}?tab=host`);
    await expect(page.getByTestId('notification')).toHaveCount(5);
    await expect(page.locator('[data-testid="notification"][data-read="false"]')).toHaveCount(0);
  });
});
