import type { Page } from '@playwright/test';

import { NEW_APPROVED_ORDER_UUID, resetTicketStore } from '@/api/__mocks__/fixtures/my-ticket';
import { resetNotificationStore } from '@/api/__mocks__/fixtures/notification';

import { setMockSession } from './support/auth';
import { expect, test } from './support/fixtures';

/**
 * P9b-L 라우트 로직 — 알림함 `/mypage/notifications`(보호, 브라우저 조회)와 알림을 누른 뒤의 이동.
 * 화면 모양(카테고리 아이콘·빨간 점·상대 시간)은 보지 않는다(V).
 * 호스트가 받은 주문 알림의 `?order=` 진입(예매자 관리 주문 상세가 열린 상태)은 P13a-L과 나눈다 — 여기서는 링크 주소만 본다.
 */
test.beforeEach(() => {
  resetTicketStore();
  resetNotificationStore();
});

const PATH = '/mypage/notifications';
const row = (page: Page, title: string) =>
  page.getByTestId('notification').filter({ hasText: title }).first();
const readRequest = (page: Page) =>
  page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/me/notifications/read'));

test.describe('알림함', () => {
  test('비로그인이면 로그인으로 가고 돌아올 곳은 알림함', async ({ page }) => {
    await setMockSession(page, 'anonymous');
    await page.goto(PATH);
    await expect(page).toHaveURL(`/login?redirect=${encodeURIComponent(PATH)}`);
  });

  test('로그인하면 200, GN-1은 브라우저에서만 첫 페이지부터', async ({ page, mockApi }) => {
    await setMockSession(page, 'loggedIn');
    const res = await page.goto(PATH);
    expect(res?.status()).toBe(200);
    await expect(page.getByTestId('notification')).toHaveCount(20);
    const lists = mockApi.calls().filter((c) => c.path.startsWith('/api/v2/me/notifications?'));
    expect(lists.map((c) => [c.from, c.path])).toEqual([
      ['browser', '/api/v2/me/notifications?page=0'],
    ]);
  });

  test('승인 알림을 누르면 PN-3 단건 → 주문상세로, 티켓탭 공지 바가 풀려 있다', async ({
    page,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/tickets');
    await expect(page.getByRole('status')).toContainText('NEW 티켓 주문이 승인되었습니다!');

    await page.goto(PATH);
    const approved = row(page, '티켓 주문이 승인되었습니다!');
    await expect(approved).toHaveAttribute('data-read', 'false');
    const read = readRequest(page);
    await approved.getByRole('link').click();
    expect((await read).postDataJSON()).toEqual({ notificationIds: [125] });
    await expect(page).toHaveURL(`/orders/${NEW_APPROVED_ORDER_UUID}`);

    await page.goto('/tickets');
    await expect(page.getByTestId('ticket-group').first()).toBeVisible();
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('target.type별 이동 — EVENT → 공연 상세, GIFT → 티켓탭, HOST → 호스트 홈', async ({
    page,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(PATH);
    await row(page, '1시간 뒤에 시작됩니다!').getByRole('link').click();
    await expect(page).toHaveURL('/events/101');

    await page.goto(PATH);
    await row(page, '선물받은 티켓이 도착했어요').getByRole('link').click();
    await expect(page).toHaveURL('/tickets');

    await page.goto(PATH);
    await row(page, '호스트 멤버로 추가되었어요').getByRole('link').click();
    await expect(page).toHaveURL('/hosts/11');
  });

  test('호스트가 받은 주문 알림은 예매자 관리 ?order= 링크(진입 검증은 P13a)', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(PATH);
    await expect(row(page, '새 주문이 승인을 기다리고 있어요').getByRole('link')).toHaveAttribute(
      'href',
      '/hosting/events/101/guests?order=mock-host-order-1',
    );
  });

  test('모두 읽음은 PN-3 {readAll:true}, 다시 들어와도 모두 읽음', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(PATH);
    await expect(page.getByTestId('notification')).toHaveCount(20);
    const read = readRequest(page);
    await page.getByRole('button', { name: '모두 읽음' }).click();
    expect((await read).postDataJSON()).toEqual({ readAll: true });
    await expect(page.locator('[data-testid="notification"][data-read="false"]')).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('notification')).toHaveCount(20);
    await expect(page.locator('[data-testid="notification"][data-read="false"]')).toHaveCount(0);
  });
});
