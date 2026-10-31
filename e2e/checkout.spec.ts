import { CHECKOUT_TICKET } from '@/api/__mocks__/fixtures/order';
import { orderHandlers } from '@/api/__mocks__/order.handlers';
import { checkoutHref } from '@/features/audience/checkout/model/checkout-params';

import { setMockSession } from './support/auth';
import { expect, test } from './support/fixtures';

/**
 * P7 라우트 로직 — 체크아웃(보호)과 주문 완료 주소. 화면 모양·흐름은 QA `checkout`(P7-V)이 본다.
 * 상세 화면의 [티켓 구매하기] 연결은 P6-V라, 여기서는 상세가 만드는 것과 같은 주소(`checkoutHref`)로 들어간다.
 */
const href = checkoutHref(101, { ticketItemId: CHECKOUT_TICKET.paidWithOptions, quantity: 2 });

test.describe('체크아웃 → 주문 완료', () => {
  test('로그인 상태에서 선택 쿼리로 들어와 제출하면 완료 주소로 replace되고, 새로고침해도 같은 주문(G11/O-3 재조회)', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(href);

    await expect(page.getByRole('button', { name: /일반 예매.*\(1\/2\)/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /일반 예매.*\(2\/2\)/ })).toBeVisible();
    await page
      .getByRole('radiogroup', { name: /뒤풀이 참석/ })
      .getByRole('radio', { name: '예' })
      .click();
    await page.getByRole('textbox', { name: '응원하는 멤버' }).fill('보컬');
    await page.getByRole('checkbox', { name: /환불\/취소 규정/ }).click();
    // (15,000 + 10,000) × 2
    await expect(page.getByTestId('checkout-amount')).toHaveText('50,000 원');

    await page.getByRole('button', { name: '결제하기' }).click();
    await page
      .getByRole('alertdialog', { name: '주문 완료하기' })
      .getByRole('button', { name: '결제완료' })
      .click();

    await expect(page).toHaveURL(/\/orders\/mock-order-[^/?]+\?created=1$/);
    await expect(page.getByRole('heading', { name: '주문 완료!' })).toBeVisible();
    await expect(page.getByTestId('order-result')).toHaveAttribute(
      'data-kind',
      'AWAITING_DEPOSIT_APPROVAL',
    );

    const orderPath = new URL(page.url()).pathname;
    // 생성 응답을 캐시에 넣었으므로 완료 화면은 O-3을 부르지 않는다
    expect(mockApi.calls().filter((c) => c.path.startsWith(`/api/v2/me${orderPath}`))).toEqual([]);
    // 주문 요청은 한 번
    expect(
      mockApi.calls().filter((c) => c.method === 'POST' && c.path === '/api/v2/me/orders'),
    ).toHaveLength(1);

    await page.reload();
    await expect(page.getByRole('heading', { name: '주문 완료!' })).toBeVisible();
    await expect(page.getByTestId('order-result')).toHaveAttribute(
      'data-kind',
      'AWAITING_DEPOSIT_APPROVAL',
    );
    const reads = mockApi.calls().filter((c) => c.path === `/api/v2/me${orderPath}`);
    expect(reads.map((c) => [c.from, c.status])).toEqual([['browser', 200]]);

    // 뒤로가기로 체크아웃에 돌아오지 않는다(replace)
    await page.goBack();
    await expect(page).not.toHaveURL(/\/checkout/);
  });

  test('비로그인이면 로그인으로 가고, 돌아올 곳에 티켓·수량 쿼리가 남는다', async ({ page }) => {
    await setMockSession(page, 'anonymous');
    await page.goto(href);
    await expect(page).toHaveURL(/\/login\?redirect=/);
    const redirect = new URL(page.url()).searchParams.get('redirect');
    expect(redirect).toBe(href);
  });

  test('주소의 선택이 틀리면 공연 상세로 돌려보낸다(체크아웃 조회 없음)', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/events/101/checkout?ticketItemId=501&quantity=0');
    await expect(page).toHaveURL(/\/events\/101$/);
    expect(mockApi.calls().filter((c) => c.path.includes('/checkout'))).toEqual([]);
  });

  test('판매 중이 아닌 티켓(O-0 404)이면 공연 상세로 돌려보낸다', async ({ page, mockApi }) => {
    mockApi.use(...orderHandlers.checkoutNotFound);
    await setMockSession(page, 'loggedIn');
    await page.goto(href);
    await expect(page).toHaveURL(/\/events\/101$/);
  });

  test('없는(남의) 주문 주소는 찾을 수 없음', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/orders/mock-order-missing?created=1');
    await expect(page.getByText('주문을 찾을 수 없어요')).toBeVisible();
  });
});
