import {
  NEW_APPROVED_ORDER_UUID,
  resetTicketStore,
  TICKET_UUID,
} from '@/api/__mocks__/fixtures/my-ticket';

import { setMockSession } from './support/auth';
import { expect, test } from './support/fixtures';

/**
 * P8-L 라우트 로직 — 티켓탭 `/tickets`(보호, 브라우저 조회). 화면 모양·QR 렌더는 보지 않는다(V).
 */
test.beforeEach(() => resetTicketStore());

test.describe('티켓탭', () => {
  test('비로그인이면 로그인으로 가고 돌아올 곳은 /tickets', async ({ page }) => {
    await setMockSession(page, 'anonymous');
    await page.goto('/tickets');
    await expect(page).toHaveURL('/login?redirect=%2Ftickets');
  });

  test('들어가면 T-1·T-3만(브라우저), T-2는 카드를 열 때만 — 열면 공지 바가 풀린다', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    const res = await page.goto('/tickets');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('status')).toContainText('NEW 티켓 주문이 승인되었습니다!');
    const detail = (p: string) => /^\/api\/v2\/me\/tickets\/(?!new-approved)/.test(p);
    expect(mockApi.calls().filter((c) => detail(c.path))).toEqual([]);
    expect(
      mockApi
        .calls()
        .filter((c) => c.path.startsWith('/api/v2/me/tickets'))
        .every((c) => c.from === 'browser'),
    ).toBe(true);

    const group = page.locator(`#group-${NEW_APPROVED_ORDER_UUID}`);
    await group.getByRole('button', { name: '티켓 열기' }).click();
    await expect(page.getByTestId('qr-value')).toHaveText(TICKET_UUID.approved);
    expect(
      mockApi
        .calls()
        .filter((c) => detail(c.path))
        .map((c) => c.path),
    ).toEqual([`/api/v2/me/tickets/${TICKET_UUID.approved}`]);
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('선물 보내기 → 링크 생성 → 같은 티켓은 QR 대신 선물 대기 안내', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/tickets');
    const group = page.locator(`#group-${NEW_APPROVED_ORDER_UUID}`);
    await group.getByRole('button', { name: '티켓 열기' }).click();
    const detail = page.getByRole('region', { name: '티켓 상세' });
    await detail.getByRole('textbox', { name: '메모' }).fill('친구');
    await detail.getByRole('button', { name: '선물하기' }).click();
    await expect(page.getByTestId('gift-link')).toHaveText(/\/gifts\/mock-gift-new-\d+$/);
    await expect(page.getByTestId('qr-notice')).toHaveText(/선물 대기 중인 티켓이에요/);
    await expect(page.getByTestId('qr-value')).toHaveCount(0);
    const posts = mockApi.calls().filter((c) => c.method === 'POST');
    expect(posts.map((c) => c.path)).toEqual([`/api/v2/me/tickets/${TICKET_UUID.approved}/gift`]);
  });
});
