import type { Page } from '@playwright/test';

import { resetTicketStore as resetMyTicketStore } from '@/api/__mocks__/fixtures/my-ticket';
import { CHECKOUT_TICKET } from '@/api/__mocks__/fixtures/order';
import { GUEST_ORDER } from '@/api/__mocks__/guest-store';
import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { actAsRole } from '@/api/__mocks__/host-store';
import { resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { resetOrderStore } from '@/api/__mocks__/order.handlers';
import { checkoutHref } from '@/features/audience/checkout/model/checkout-params';

import { setMockSession } from './support/auth';
import { expect, test } from './support/fixtures';

/**
 * P13a-L 라우트 로직 — 예매자 관리(`/hosting/events/[eventId]/guests`)의 `?tab=`·`?order=` 주소 상태(patterns §6)와 뒤로가기,
 * 일반 멤버 화면, 엑셀, 등록 후 대시보드, 그리고 크리티컬 패스(체크아웃 → 주문 → 호스트 승인 → 티켓탭). 호스팅 센터라 조회는
 * 브라우저에서만 한다. P13a-V 마크업(표 행 = 버튼, 상세 = 오버레이)으로 주소·상태 글자·요청을 본다. mock 저장소는 테스트마다 되돌린다.
 */
const resetStores = () => {
  resetHostMockState();
  resetHostingStore();
  resetOrderStore();
  resetMyTicketStore();
};
test.beforeEach(resetStores);
test.afterEach(resetStores);

const GUESTS = '/hosting/events/101/guests';
const detail = (page: Page) =>
  page.getByRole('dialog').filter({ has: page.getByTestId('order-detail') });
const row = (page: Page, orderNoOrName: string) =>
  page.getByTestId('order-row').filter({ hasText: orderNoOrName });

test.describe('?tab= · ?order= 주소 상태', () => {
  test('탭은 주소에 남아 새로고침해도 유지된다(기본 주문 탭은 주소에 없음)', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(GUESTS);
    await expect(page.getByRole('tab', { name: '주문' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('order-row')).toHaveCount(9);
    await page.getByRole('tab', { name: '환불' }).click();
    await expect(page).toHaveURL(`${GUESTS}?tab=refunds`);
    await expect(page.getByTestId('refund-row')).toHaveCount(4);
    await page.reload();
    await expect(page.getByRole('tab', { name: '환불' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('refund-row')).toHaveCount(4);
    await page.getByRole('tab', { name: '발급된 티켓' }).click();
    await expect(page).toHaveURL(`${GUESTS}?tab=tickets`);
    await expect(page.getByTestId('ticket-row')).toHaveCount(3);
  });

  test('?order=로 들어오면(호스트 알림 진입) 주문 상세가 열린 상태 — 닫으면 order만 지우고 뒤로가기는 들어오기 전 화면으로', async ({
    page,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/events/101/dashboard');
    await page.goto(`${GUESTS}?tab=orders&order=${GUEST_ORDER.pendingTransfer}`);
    await expect(detail(page).getByTestId('detail-status')).toHaveText('승인 대기');
    await detail(page).getByRole('button', { name: '닫기' }).click();
    await expect(page).toHaveURL(`${GUESTS}?tab=orders`);
    await expect(detail(page)).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL('/hosting/events/101/dashboard');
  });

  test('목록에서 열면 뒤로가기는 상세만 닫는다 — 닫기로 닫은 뒤 뒤로가기가 헛돌지 않는다', async ({
    page,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/events/101/dashboard');
    await page.goto(GUESTS);
    await row(page, '김민수').first().click();
    await expect(page).toHaveURL(new RegExp(`${GUESTS}\\?order=guest-order-101-`));
    await expect(detail(page)).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(GUESTS);
    await expect(detail(page)).toHaveCount(0);
    await expect(page.getByTestId('order-row')).toHaveCount(9);

    await row(page, '김민수').first().click();
    await expect(detail(page)).toBeVisible();
    await detail(page).getByRole('button', { name: '닫기' }).click();
    await expect(page).toHaveURL(GUESTS);
    await page.goBack();
    await expect(page).toHaveURL('/hosting/events/101/dashboard');
  });

  test('없는 주문(?order=)은 공용 404가 아니라 닫고 안내', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(`${GUESTS}?order=no-such-order`);
    await expect(page.getByText('주문을 찾을 수 없어요. 목록을 다시 불러왔어요')).toBeVisible();
    await expect(page).toHaveURL(GUESTS);
    await expect(page.getByTestId('order-row')).toHaveCount(9);
  });
});

test.describe('주문 처리', () => {
  test('승인하면 상세가 승인 완료로 바뀌고 상태 탭 건수가 갱신된다', async ({ page, mockApi }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(`${GUESTS}?order=${GUEST_ORDER.pendingTransfer}`);
    await expect(page.getByTestId('status-PENDING_APPROVE')).toHaveText('승인 대기 2');
    await detail(page).getByRole('button', { name: '승인' }).click();
    await expect(detail(page).getByTestId('detail-status')).toHaveText('승인 완료');
    await expect(page.getByTestId('status-PENDING_APPROVE')).toHaveText('승인 대기 1');
    await expect(page.getByTestId('status-APPROVED')).toHaveText('승인 완료 3');
    expect(
      mockApi
        .calls()
        .filter((c) => c.method === 'POST')
        .map((c) => c.path),
    ).toEqual([`/api/v2/events/101/orders/${GUEST_ORDER.pendingTransfer}/approve`]);
  });

  test('두둥 주문 거절: 확인 문구에 직접 환불 안내(C-3), 기타 사유 문구를 보낸다', async ({
    page,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(`${GUESTS}?order=${GUEST_ORDER.pendingToss}`);
    await detail(page).getByRole('button', { name: '거절', exact: true }).click();
    await expect(detail(page).getByTestId('refuse-dudoong-notice')).toHaveText(
      '이미 입금을 받았다면 구매자에게 직접 환불해야 해요',
    );
    await detail(page).getByRole('radio', { name: '기타 - 직접 입력' }).click();
    await detail(page).getByLabel('기타 사유').fill('중복 주문');
    const post = page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/refuse'));
    await detail(page).getByRole('button', { name: '거절하기' }).click();
    expect((await post).postDataJSON()).toEqual({ reasonType: 'ETC', reasonText: '중복 주문' });
    await expect(detail(page).getByTestId('detail-status')).toHaveText('승인 거절');
  });
});

test.describe('권한 · 엑셀', () => {
  test('일반 멤버: 엑셀 버튼 없음, 가린 연락처·입금자명 그대로, 검색 칸 완전 일치 안내, 처리 버튼 없음', async ({
    page,
  }) => {
    actAsRole(11, 'GUEST');
    await setMockSession(page, 'loggedIn');
    await page.goto(GUESTS);
    await expect(page.getByTestId('order-row')).toHaveCount(9);
    await expect(page.getByRole('button', { name: '주문 엑셀로 다운로드' })).toHaveCount(0);
    const toss = page.getByTestId('order-row').filter({ hasText: '이서연' }).first();
    await expect(toss.getByTestId('order-phone')).toHaveText('010-****-7890');
    await expect(page.getByTestId('exact-hint')).toHaveCount(0);
    await page.getByRole('combobox', { name: '검색 기준' }).click();
    await page.getByRole('option', { name: '연락처' }).click();
    await expect(page.getByTestId('exact-hint')).toHaveText(
      '연락처·입금자명은 전체를 정확히 입력해야 찾을 수 있어요',
    );
    await page.goto(`${GUESTS}?order=${GUEST_ORDER.pendingTransfer}`);
    await expect(detail(page).getByTestId('detail-status')).toHaveText('승인 대기');
    await expect(detail(page).getByRole('button', { name: '승인' })).toHaveCount(0);
  });

  test('매니저 이상은 엑셀(래퍼 없는 xlsx)을 내려받는다', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(GUESTS);
    await expect(page.getByTestId('order-row')).toHaveCount(9);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: '주문 엑셀로 다운로드' }).click();
    expect((await download).suggestedFilename()).toBe('orders-101.xlsx');
  });
});

test('등록 후 대시보드: 승인 대기 수(= 사이드바 배지 수), 카드 4개, 입장 현황 분모 = 발급 수', async ({
  page,
}) => {
  await setMockSession(page, 'loggedIn');
  await page.goto('/hosting/events/101/dashboard');
  await expect(page.getByTestId('stat-pendingApprove')).toContainText('승인 대기');
  await expect(page.getByTestId('stat-pendingApprove')).toContainText('2건');
  await expect(page.getByTestId('stat-refundRequested')).toContainText('환불 요청');
  await expect(page.getByTestId('stat-refundRequested')).toContainText('3건');
  await expect(page.getByTestId('entrance')).toContainText('1/3');
  await expect(
    page.getByRole('progressbar', { name: '입장 현황 — 발급 3장 중 1장 입장' }),
  ).toBeVisible();
  await page.getByTestId('stat-refundRequested').click();
  await expect(page).toHaveURL(`${GUESTS}?tab=refunds`);
});

test('크리티컬 패스: 체크아웃 → 주문 → 호스트 승인 → 티켓탭에 발급', async ({ page }) => {
  await setMockSession(page, 'loggedIn');
  await page.goto(checkoutHref(101, { ticketItemId: CHECKOUT_TICKET.paidNoOptions, quantity: 1 }));
  await page.getByRole('checkbox', { name: /환불\/취소 규정/ }).click();
  await page.getByRole('checkbox', { name: '(필수) 호스트에게 개인정보 제공 동의' }).click();
  await page.getByRole('button', { name: '결제하기' }).click();
  await page
    .getByRole('alertdialog', { name: '주문 완료하기' })
    .getByRole('checkbox', { name: '(필수) 위 내용을 확인했으며 이에 동의합니다' })
    .click();
  await page
    .getByRole('alertdialog', { name: '주문 완료하기' })
    .getByRole('button', { name: '주문 완료하기' })
    .click();
  await expect(page).toHaveURL(/\/orders\/mock-order-[^/?]+\?created=1$/);
  const orderUuid = new URL(page.url()).pathname.split('/').at(-1)!;

  await page.goto(`${GUESTS}?order=${orderUuid}`);
  await expect(detail(page).getByTestId('detail-status')).toHaveText('승인 대기');
  await detail(page).getByRole('button', { name: '승인' }).click();
  await expect(detail(page).getByTestId('detail-status')).toHaveText('승인 완료');

  await page.goto('/tickets');
  await expect(page.locator(`#group-${orderUuid}`)).toBeVisible();
  await expect(page.getByRole('status')).toContainText('NEW 티켓 주문이 승인되었습니다!');
});
