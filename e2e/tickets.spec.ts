import type { Page } from '@playwright/test';

import {
  NEW_APPROVED_ORDER_UUID,
  resetTicketStore,
  TICKET_UUID,
} from '@/api/__mocks__/fixtures/my-ticket';

import { setMockSession } from './support/auth';
import { expect, test } from './support/fixtures';

/**
 * P8-L 라우트 로직 — 티켓탭 `/tickets`(보호, 브라우저 조회). 화면 모양은 QA 시나리오(`qa/scenarios/tickets.qa.ts`)가 본다.
 */

/** 묶음 카드를 가운데로 넘기고(가운데가 아니면 첫 탭은 넘기기만) 눌러 입장 QR 층을 연다(P8-V) */
async function openQr(page: Page, groupKey: string) {
  const group = page.locator(`#group-${groupKey}`);
  if ((await group.getAttribute('data-active')) !== 'true') await group.getByRole('button').click();
  await expect(group).toHaveAttribute('data-active', 'true');
  await group.getByRole('button', { name: '입장 QR 보기' }).click();
  return page.getByRole('dialog', { name: '입장 QR' });
}
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

    await openQr(page, NEW_APPROVED_ORDER_UUID);
    await expect(page.getByTestId('qr-value')).toHaveAttribute('data-value', TICKET_UUID.approved);
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
    const layer = await openQr(page, NEW_APPROVED_ORDER_UUID);
    await expect(page.getByTestId('qr-value')).toBeVisible();
    await layer.getByRole('button', { name: '선물하기' }).click();
    const sheet = page.getByRole('dialog', { name: '티켓을 선물할까요?' });
    const send = sheet.getByRole('button', { name: '티켓 선물하기' });
    // 유의사항 확인 체크 전에는 보낼 수 없다(#19)
    await expect(send).toBeDisabled();
    await sheet
      .getByRole('checkbox', { name: '티켓 선물하기 관련 유의사항을 확인했습니다.' })
      .check();
    await send.click();
    await expect(page.getByRole('heading', { name: '선물 링크 생성 완료!' })).toBeVisible();
    await expect(page.getByTestId('gift-link')).toHaveAttribute(
      'data-value',
      /\/gifts\/mock-gift-new-\d+$/,
    );
    await page.getByRole('textbox', { name: '선물 대상 메모' }).fill('친구');
    await page.getByRole('textbox', { name: '선물 대상 메모' }).press('Enter');
    await expect(page.getByText('메모를 저장했어요')).toBeVisible();
    await page.getByRole('button', { name: '티켓 페이지로' }).click();
    await openQr(page, NEW_APPROVED_ORDER_UUID);
    await expect(page.getByTestId('qr-notice')).toHaveText('선물중인 티켓');
    await expect(page.getByTestId('qr-value')).toHaveCount(0);
    const posts = mockApi.calls().filter((c) => c.method === 'POST');
    expect(posts.map((c) => c.path)).toEqual([`/api/v2/me/tickets/${TICKET_UUID.approved}/gift`]);
    // 메모는 링크 생성 뒤 PG-8(PATCH)로
    expect(
      mockApi.calls().filter((c) => c.method === 'PATCH' && c.path.startsWith('/api/v2/me/gifts/')),
    ).toHaveLength(1);
  });
});
