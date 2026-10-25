import { MISSING_ORDER_UUID, P9_ORDER } from '@/api/__mocks__/fixtures/order';
import { resetMeStore } from '@/api/__mocks__/me.handlers';
import { resetOrderStore } from '@/api/__mocks__/order.handlers';

import { setMockSession } from './support/auth';
import { expect, test } from './support/fixtures';

/**
 * P9-L 라우트 로직 — 마이페이지·주문내역·주문상세·관심 호스트·아카이빙(모두 보호, 브라우저 조회). 상태 코드·이동만 본다
 * (최소 마크업, 화면 모양은 V).
 */
test.beforeEach(() => {
  resetOrderStore();
  resetMeStore();
});

test.describe('마이페이지(보호)', () => {
  for (const path of ['/mypage', '/orders', '/mypage/following', '/mypage/archive']) {
    test(`비로그인으로 ${path}에 오면 로그인으로 가고 돌아올 곳이 남는다`, async ({ page }) => {
      await setMockSession(page, 'anonymous');
      await page.goto(path);
      await expect(page).toHaveURL(`/login?redirect=${encodeURIComponent(path)}`);
    });
  }

  test('마이페이지 → 관심 호스트 · 아카이빙 · 주문내역으로 이동한다(서버 조회 없음)', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    const res = await page.goto('/mypage');
    expect(res?.status()).toBe(200);
    await expect(page.getByTestId('profile-name')).toHaveText('두둥이');
    await page.getByRole('link', { name: '관심 호스트' }).click();
    await expect(page).toHaveURL('/mypage/following');
    await expect(page.getByTestId('following-host').first()).toBeVisible();
    await page.goBack();
    await page.getByRole('link', { name: '관람 공연 아카이빙' }).click();
    await expect(page).toHaveURL('/mypage/archive');
    await expect(page.getByTestId('archive-event').first()).toBeVisible();
    expect(
      mockApi
        .calls()
        .filter((c) => c.path.startsWith('/api/v2/me'))
        .every((c) => c.from === 'browser'),
    ).toBe(true);
  });
});

test.describe('주문내역 → 주문상세', () => {
  test('목록 행을 누르면 그 주문의 상세 주소로 가고, 상세는 O-3을 브라우저에서 한 번 읽는다', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    const res = await page.goto('/orders');
    expect(res?.status()).toBe(200);
    const row = page
      .getByTestId('order-row')
      .filter({ has: page.locator(`a[href="/orders/${P9_ORDER.approvedPaid}"]`) });
    await expect(row.getByTestId('order-status')).toHaveText('승인완료');
    await row.getByRole('link').click();
    await expect(page).toHaveURL(`/orders/${P9_ORDER.approvedPaid}`);
    // 앞 화면(주문내역)은 숨긴 채 DOM에 남는다(Activity) — 상세 <main>으로 좁힌다
    const detail = page.locator('main', {
      has: page.getByRole('heading', { name: '주문 상세' }),
    });
    await expect(detail.getByTestId('order-no')).toHaveText('R9000001');
    await expect(detail.getByTestId('order-status')).toHaveText('승인완료');
    await expect(detail.getByRole('button', { name: '주문취소' })).toBeVisible();
    const reads = mockApi
      .calls()
      .filter((c) => c.path === `/api/v2/me/orders/${P9_ORDER.approvedPaid}`);
    expect(reads.map((c) => [c.from, c.status])).toEqual([['browser', 200]]);
  });

  test('남의(없는) 주문 주소는 공용 404 안내', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(`/orders/${MISSING_ORDER_UUID}`);
    await expect(page.getByText('주문을 찾을 수 없어요')).toBeVisible();
  });

  test('삭제된 공연의 주문상세는 공연 정보 없이 열리고 취소·문의 입구가 없다', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(`/orders/${P9_ORDER.deletedEvent}`);
    await expect(page.getByTestId('event-removed')).toBeVisible();
    await expect(page.getByRole('button', { name: '주문취소' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '호스트 문의' })).toHaveCount(0);
  });

  test('선물 대기 티켓이 있는 주문은 [주문취소] 대신 선물 안내', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(`/orders/${P9_ORDER.giftPending}`);
    await expect(page.getByTestId('gift-blocks-cancel')).toHaveText(
      '선물을 먼저 취소하거나 돌려받아 주세요',
    );
    await expect(page.getByRole('button', { name: '주문취소' })).toHaveCount(0);
  });

  test('호스트 문의는 열 때 GP-3을 쿠키와 함께(브라우저) 한 번 읽는다', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(`/orders/${P9_ORDER.approvedPaid}`);
    await expect(page.getByTestId('order-no')).toBeVisible();
    expect(mockApi.calls().filter((c) => c.path === '/api/v2/events/101')).toEqual([]);
    await page.getByRole('button', { name: '호스트 문의' }).click();
    await expect(page.getByRole('link', { name: '010-1234-5678' })).toBeVisible();
    expect(
      mockApi
        .calls()
        .filter((c) => c.path === '/api/v2/events/101')
        .map((c) => c.from),
    ).toEqual(['browser']);
  });
});

test.describe('아카이빙', () => {
  test('orderUuid가 없는 공연은 주문상세로 가지 않고, 있는 공연은 그 주문상세로 간다', async ({
    page,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/mypage/archive');
    const jazz = page.getByTestId('archive-event').filter({ hasText: '여름밤 재즈' });
    await expect(jazz).toBeVisible();
    await expect(jazz.getByRole('link')).toHaveCount(0);
    await page
      .getByTestId('archive-event')
      .filter({ hasText: '고스락 제36회 정기공연' })
      .getByRole('link')
      .click();
    await expect(page).toHaveURL(`/orders/${P9_ORDER.pastWithGift}`);
    await expect(page.getByTestId('order-no')).toHaveText('R9000005');
  });
});
