import type { Page } from '@playwright/test';

import { setStoredStatus } from '@/api/__mocks__/event-store';
import {
  resetTicketStore as resetMyTicketStore,
  TICKET_UUID,
} from '@/api/__mocks__/fixtures/my-ticket';
import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { resetHostingStore } from '@/api/__mocks__/hosting.handlers';

import { setMockSession } from './support/auth';
import { goEventMenu } from './support/event-scope';
import { expect, test } from './support/fixtures';

/**
 * P13b-L 라우트 로직 — QR 체크인(`/hosting/events/[eventId]/qr`). 호스팅 센터라 조회는 브라우저에서만 한다(셸만 렌더).
 * 카메라가 없어(Playwright) 판독 값은 주입 어댑터(`dd:qr-scan` 이벤트 — `features/hosting/qr/ui/scan-injection`)로 넣는다.
 * 카메라 자리는 권한 실패 화면이 되지만 판독은 같은 길(`submitScan`)로 간다. 상태·요청·통계 값만 본다(모양은 QA).
 * mock 저장소(공연·티켓)는 테스트마다 되돌린다.
 */
const resetStores = () => {
  resetHostMockState();
  resetHostingStore();
  resetMyTicketStore();
};
test.beforeEach(resetStores);
test.afterEach(resetStores);

const result = (page: Page) => page.getByRole('region', { name: '스캔 결과' });
/** 통계 칸 세 개 + 입장률을 예전 한 줄 모양으로 모은다 */
const stats = (page: Page) => ({
  toHaveText: async (text: string) => {
    const read = async () => {
      const t = (id: string) => page.getByTestId(id).innerText();
      return `입장 ${await t('checkin-stat-entered')}/${await t('checkin-stat-issued')} · 미입장 ${await t('checkin-stat-not-entered')} · ${(await t('checkin-stats-rate')).replace(' 입장 완료', '')}`;
    };
    await expect.poll(read).toBe(text);
  },
  toBeVisible: () => expect(page.getByTestId('checkin-stats-rate')).toContainText('입장 완료'),
});

/** 판독 값 주입(카메라 대신). 스캐너가 마운트돼 구독할 때까지 기다린다 */
async function scan(page: Page, value: string) {
  await expect(page.getByTestId('host-scan')).toBeVisible();
  await page.evaluate(
    (v) => window.dispatchEvent(new CustomEvent('dd:qr-scan', { detail: v })),
    value,
  );
}

const scanCalls = (calls: { method: string; path: string }[], eventId: number) =>
  calls.filter((c) => c.method === 'POST' && c.path === `/api/v2/events/${eventId}/check-ins`);

test.describe('[호스트가 스캔]', () => {
  test('공연 메뉴 → QR 체크인, 스캔하면 입장 완료 + 체크인 통계가 갱신된다, 서버 조회 없음', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/events/101/dashboard');
    await goEventMenu(page, 'QR 체크인');
    await expect(page).toHaveURL('/hosting/events/101/qr');
    await stats(page).toHaveText('입장 0/7 · 미입장 7 · 0%');

    await scan(page, TICKET_UUID.approved);
    await expect(result(page)).toHaveAttribute('data-result', 'ENTERED');
    await expect(page.getByTestId('scan-ticket')).toContainText('두둥이');
    await stats(page).toHaveText('입장 1/7 · 미입장 6 · 14.3%');
    expect(scanCalls(mockApi.calls(), 101)).toHaveLength(1);
    expect(mockApi.calls().filter((c) => c.from === 'server')).toEqual([]);
  });

  test('선물 대기 · 다른 공연 티켓 결과, 다음 스캔으로 지운다', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/events/101/qr');
    await scan(page, TICKET_UUID.giftPending);
    await expect(result(page)).toHaveAttribute('data-result', 'GIFT_PENDING');
    await page.getByRole('button', { name: '다음 스캔' }).click();
    await expect(result(page)).toHaveAttribute('data-status', 'idle');
    await scan(page, TICKET_UUID.single);
    await expect(result(page)).toHaveAttribute('data-result', 'OTHER_EVENT');
    await expect(page.getByTestId('scan-ticket')).toHaveCount(0);
  });

  test('네트워크 차단 → 실패 상태, 연결되면 다시 시도로 입장', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/events/101/qr');
    await stats(page).toBeVisible();
    await page.route('**/api/v2/events/101/check-ins', (route) =>
      route.abort('internetdisconnected'),
    );
    await scan(page, TICKET_UUID.approved);
    await expect(result(page)).toHaveAttribute('data-status', 'failed');
    await expect(result(page).getByRole('alert')).toContainText('네트워크에 연결되지 않아');

    await page.unroute('**/api/v2/events/101/check-ins');
    await result(page).getByRole('button', { name: '다시 시도' }).click();
    await expect(result(page)).toHaveAttribute('data-result', 'ENTERED');
  });

  test('스캔 사이에 공연이 끝나면(Event_400_27) 안내 후 막힌 상태로', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/events/101/qr');
    await stats(page).toBeVisible();
    setStoredStatus(101, 'CLOSED');
    await scan(page, TICKET_UUID.approved);
    await expect(page.getByTestId('host-scan-blocked')).toHaveText(
      '지난 공연은 입장 처리를 할 수 없어요',
    );
  });

  test('지난 공연은 스캔할 수 없고 요청도 없다', async ({ page, mockApi }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/events/90/qr');
    await expect(page.getByTestId('host-scan-blocked')).toHaveText(
      '지난 공연은 입장 처리를 할 수 없어요',
    );
    await stats(page).toHaveText('입장 1/3 · 미입장 2 · 33.3%');
    expect(scanCalls(mockApi.calls(), 90)).toEqual([]);
  });
});

test.describe('[관객이 스캔]', () => {
  test('QR 주소 = 이 사이트 origin + qrPath, 그 주소로 들어가면 셀프 체크인(PQ-5)', async ({
    page,
    baseURL,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/events/101/qr');
    await page.getByRole('tab', { name: '관객이 QR 스캔' }).click();
    const qr = page.getByTestId('self-check-in-qr');
    const expected = `${new URL(baseURL!).origin}/check-in?token=mock-checkin-101`;
    await expect(qr).toHaveAttribute('data-value', expected);
    await expect(qr.locator('svg')).toBeVisible();

    await page.goto(expected);
    // 101에는 입장 전 내 티켓이 2장 — 고르기
    await expect(page.getByRole('region', { name: '티켓 고르기' })).toBeVisible();
  });

  test('정산중 공연 → 셀프 체크인 안내만, GQ-4를 부르지 않는다(호스트 스캔은 된다)', async ({
    page,
    mockApi,
  }) => {
    setStoredStatus(101, 'CALCULATING');
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/events/101/qr');
    await expect(page.getByTestId('host-scan')).toBeVisible();
    await page.getByRole('tab', { name: '관객이 QR 스캔' }).click();
    await expect(page.getByTestId('self-check-in-guidance')).toHaveText(
      '공연이 끝나면(정산중·지난 공연) 셀프 체크인이 안 돼요',
    );
    await expect(page.getByTestId('self-check-in-qr')).toHaveCount(0);
    expect(mockApi.calls().filter((c) => c.path.endsWith('/check-in-qr'))).toEqual([]);
  });
});
