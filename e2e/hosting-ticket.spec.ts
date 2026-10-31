import type { Page } from '@playwright/test';

import { createStoredEvent } from '@/api/__mocks__/event-store';
import { HOST_GOSROCK } from '@/api/__mocks__/fixtures/event';
import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { actAsRole } from '@/api/__mocks__/host-store';
import { resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { MOCK_S3_ORIGIN } from '@/api/__mocks__/upload-handlers';

import { setMockSession } from './support/auth';
import { expect, test } from './support/fixtures';

/**
 * P12-L 라우트 로직 — 티켓 관리(`/hosting/events/[eventId]/tickets`)·새 티켓(`…/tickets/new`)·수정(`…/tickets/[ticketItemId]`)·
 * 옵션 붙이기, 그리고 P11이 남긴 "티켓 있는 공연의 등록 완주". 호스팅 센터라 조회는 브라우저에서만 한다(셸만 렌더).
 * 최소 마크업이라 상태·요청 본문·관객 GP-5 응답만 본다(모양은 V). mock 저장소(`ticket-store.ts`)는 테스트마다 되돌린다.
 */
const resetStores = () => {
  resetHostMockState();
  resetHostingStore();
};
test.beforeEach(resetStores);
test.afterEach(resetStores);

const cards = (page: Page) => page.getByTestId('ticket-card');
const card = (page: Page, name: string) => cards(page).filter({ hasText: name });
const menu = (page: Page) =>
  page.getByRole('navigation', { name: '공연 메뉴' }).getByRole('listitem');

/** 관객 GP-5(공개) — 판매 중인 티켓 id */
async function publicTicketIds(page: Page, eventId: number) {
  const res = await page.request.get(`/api/v2/events/${eventId}/ticket-items`);
  const body = (await res.json()) as { data: { ticketItemId: number }[] };
  return body.data.map((t) => t.ticketItemId);
}

async function fillDudoongForm(page: Page, name: string) {
  await page.getByLabel('티켓 이름').fill(name);
  await page.getByLabel('가격').fill('15000');
  await page.getByLabel('은행 검색').fill('신한');
  await page
    .getByRole('list', { name: '은행 목록' })
    .getByRole('button', { name: '신한은행' })
    .click();
  await expect(page.getByTestId('selected-bank')).toHaveText('신한은행');
  await page.getByLabel('예금주').fill('고스락');
  await page.getByLabel('계좌번호').fill('110-123-456789');
}

test.describe('새 티켓 만들기', () => {
  test('빈 목록 → 두둥 티켓(기본값: 무제한 + 재고 공개 꺼짐 · 승인 잠금) → 목록에 나온다, 은행은 bankCode로', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/events/140/tickets');
    await expect(page.getByTestId('tickets-empty')).toHaveText('만든 티켓이 없어요');
    await page.getByRole('link', { name: '새 티켓 만들기' }).click();
    await expect(page).toHaveURL('/hosting/events/140/tickets/new');
    await expect(page.getByLabel('판매 수량 무제한')).toBeChecked();
    await expect(page.getByLabel('재고 공개')).not.toBeChecked();
    await expect(page.getByLabel('재고 공개')).toBeDisabled();
    await expect(page.getByLabel('관리자 승인')).toBeChecked();
    await expect(page.getByLabel('관리자 승인')).toBeDisabled();

    await fillDudoongForm(page, '일반 예매');
    const post = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().endsWith('/api/v2/events/140/ticket-items'),
    );
    await page.getByRole('button', { name: '티켓 만들기' }).click();
    expect((await post).postDataJSON()).toEqual({
      payType: 'DUDOONG',
      name: '일반 예매',
      price: 15000,
      account: { bankCode: '088', accountHolder: '고스락', accountNumber: '110-123-456789' },
      approvalRequired: true,
      isQuantityPublic: false,
    });
    await expect(page).toHaveURL('/hosting/events/140/tickets');
    await expect(card(page, '일반 예매')).toBeVisible();
    await expect(card(page, '일반 예매').getByTestId('ticket-stock')).toHaveText('무제한 (비공개)');
    expect(
      mockApi
        .calls()
        .filter((c) => c.method === 'POST')
        .map((c) => [c.from, c.path, c.status]),
    ).toEqual([['browser', '/api/v2/events/140/ticket-items', 200]]);
    expect(mockApi.calls().filter((c) => c.from === 'server')).toEqual([]);
  });

  test('무료 티켓: 가격·계좌 칸이 없고 승인 토글이 열린다', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/events/140/tickets/new');
    await page.getByLabel('무료 티켓').check();
    await expect(page.getByLabel('가격')).toHaveCount(0);
    await expect(page.getByLabel('예금주')).toHaveCount(0);
    await expect(page.getByLabel('관리자 승인')).toBeEnabled();
    await page.getByLabel('관리자 승인').uncheck();
    await page.getByLabel('티켓 이름').fill('초대권');
    const post = page.waitForRequest((r) => r.method() === 'POST');
    await page.getByRole('button', { name: '티켓 만들기' }).click();
    expect((await post).postDataJSON()).toEqual({
      payType: 'FREE',
      name: '초대권',
      price: 0,
      approvalRequired: false,
      isQuantityPublic: false,
    });
    await expect(card(page, '초대권')).toBeVisible();
  });

  test('티켓 없음 공연에서는 추가할 수 없다 — 목록에 버튼이 없고 새 티켓 주소는 읽기 전용', async ({
    page,
  }) => {
    const event = createStoredEvent({
      host: HOST_GOSROCK,
      name: '버스킹',
      startAt: '2030.05.01 19:00',
      endAt: '2030.05.01 21:00',
      hasTicket: false,
    });
    await setMockSession(page, 'loggedIn');
    await page.goto(`/hosting/events/${event.eventId}/tickets`);
    await expect(page.getByTestId('no-ticket-event')).toBeVisible();
    await expect(page.getByRole('link', { name: '새 티켓 만들기' })).toHaveCount(0);
    await page.goto(`/hosting/events/${event.eventId}/tickets/new`);
    await expect(page.getByTestId('ticket-form-read-only')).toHaveText(
      '티켓 없는 공연이라 티켓을 만들 수 없어요',
    );
    await expect(page.getByRole('button', { name: '티켓 만들기' })).toHaveCount(0);
  });
});

test.describe('목록 · ⋮ 메뉴', () => {
  test('판매된 티켓은 삭제 대신 판매 중단만 — 중단하면 GP-5에서 빠지고, 재개하면 돌아온다', async ({
    page,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/events/101/tickets');
    const sold = card(page, '일반 예매');
    await expect(sold).toHaveAttribute('data-locked', 'true');
    await expect(sold.getByRole('button', { name: '삭제' })).toHaveCount(0);
    await expect(card(page, '초대권').getByRole('button', { name: '삭제' })).toBeVisible();
    expect(await publicTicketIds(page, 101)).toEqual([501, 502, 503]);

    await sold.getByRole('button', { name: '판매 중단' }).click();
    await expect(sold.getByTestId('ticket-chip')).toHaveText('판매 중단');
    expect(await publicTicketIds(page, 101)).toEqual([502, 503]);

    await sold.getByRole('button', { name: '판매 재개' }).click();
    await expect(sold.getByTestId('ticket-chip')).toHaveText('판매중');
    expect(await publicTicketIds(page, 101)).toEqual([501, 502, 503]);
  });

  test('판매 전 티켓을 지우면 목록과 GP-5에서 사라진다', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/events/101/tickets');
    await card(page, '초대권').getByRole('button', { name: '삭제' }).click();
    await expect(cards(page)).toHaveCount(2);
    expect(await publicTicketIds(page, 101)).toEqual([501, 502]);
  });

  test('수정: 바뀐 필드만 보낸다', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/events/101/tickets');
    await card(page, '초대권').getByRole('link', { name: '수정' }).click();
    await expect(page).toHaveURL('/hosting/events/101/tickets/503');
    await page.getByLabel('티켓 설명').fill('입장 시 확인');
    const patch = page.waitForRequest((r) => r.method() === 'PATCH');
    await page.getByRole('button', { name: '저장하기' }).click();
    expect((await patch).postDataJSON()).toEqual({ description: '입장 시 확인' });
    await expect(page).toHaveURL('/hosting/events/101/tickets');
    await expect(card(page, '초대권')).toContainText('입장 시 확인');
  });

  test('잠긴 티켓 수정 화면: 이름·가격이 잠겨 있다. 숫자가 아닌·없는 티켓은 공용 404', async ({
    page,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/events/101/tickets/501');
    await expect(page.getByTestId('ticket-locked')).toBeVisible();
    await expect(page.getByLabel('티켓 이름')).toHaveAttribute('readonly', '');
    await expect(page.getByLabel('가격')).toHaveAttribute('readonly', '');
    await page.goto('/hosting/events/101/tickets/abc');
    await expect(page.getByText('찾을 수 없어요')).toBeVisible();
    await page.goto('/hosting/events/101/tickets/999');
    await expect(page.getByText('찾을 수 없어요')).toBeVisible();
  });

  test('일반 멤버에게는 메뉴·[새 티켓 만들기]·옵션 입구가 없다', async ({ page }) => {
    actAsRole(11, 'GUEST');
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/events/101/tickets');
    await expect(cards(page)).toHaveCount(3);
    await expect(page.getByRole('link', { name: '새 티켓 만들기' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '판매 중단' })).toHaveCount(0);
    await expect(page.getByText('티켓 옵션 추가')).toHaveCount(0);
  });
});

test.describe('옵션', () => {
  test('카드 [티켓 옵션 추가]에서 새 옵션을 만들면 생성 + 지정 두 번 호출 → GP-5 옵션에도 나온다', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/events/101/tickets');
    const free = card(page, '초대권');
    await free.getByText('티켓 옵션 추가').click();
    // 무료 티켓에는 유료 옵션(뒤풀이 +10,000)이 선택지에 없다
    await expect(free.getByRole('button', { name: '뒤풀이 참석 붙이기' })).toHaveCount(0);
    await free.getByLabel('옵션 이름').fill('응원 문구');
    await free.getByLabel('옵션 설명').fill('짧게 적어 주세요');
    await free.getByRole('button', { name: '옵션 만들어 붙이기' }).click();
    await expect(free.getByRole('list', { name: '초대권 옵션' })).toHaveText('응원 문구');
    expect(
      mockApi
        .calls()
        .filter((c) => c.method !== 'GET')
        .map((c) => [c.method, c.path, c.status]),
    ).toEqual([
      ['POST', '/api/v2/events/101/options', 200],
      ['PUT', '/api/v2/events/101/ticket-items/503/options', 200],
    ]);
    const res = await page.request.get('/api/v2/events/101/ticket-items');
    const gp5 = (await res.json()) as {
      data: { ticketItemId: number; options: { name: string }[] }[];
    };
    expect(gp5.data.find((t) => t.ticketItemId === 503)?.options.map((o) => o.name)).toEqual([
      '응원 문구',
    ]);
  });
});

const S3_CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'PUT',
  'access-control-allow-headers': 'content-type',
};
const PNG = { name: 'poster.png', mimeType: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4e]) };

test.describe('티켓 있는 공연의 등록 완주(P11이 남긴 것)', () => {
  test('만들기 → 기본 정보 → 섹션 → 체크리스트 ③은 티켓을 만들어야 찬다 → 등록 → 관객 GP-5에 티켓', async ({
    page,
  }) => {
    await page.route(`${MOCK_S3_ORIGIN}/**`, (route) =>
      route.fulfill({ status: 200, headers: S3_CORS, body: '' }),
    );
    await page.route('https://dapi.kakao.com/**', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `window.kakao = { maps: { load: (cb) => cb(), services: { Status: { OK: 'OK' },
          Geocoder: class { addressSearch(a, cb) { cb([{ x: '126.9219', y: '37.5509' }], 'OK'); } } } } };`,
      }),
    );
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/new/events?hostId=11');
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByLabel('공연 이름').fill('겨울 정기공연');
    await page.getByLabel('날짜').fill('2030-12-01');
    await page.getByLabel('시작 시각').fill('19:00');
    await page.getByLabel('종료 시각').fill('21:00');
    await page.getByLabel('티켓 있음').check();
    await page.getByRole('button', { name: '공연 만들기' }).click();
    await expect(page).toHaveURL(/\/hosting\/events\/7001\/dashboard/);

    // 기본 정보
    await menu(page).getByRole('link', { name: '기본 정보' }).click();
    await page.getByLabel('포스터 올리기').setInputFiles(PNG);
    await expect(page.getByTestId('poster').getByRole('img')).toBeVisible();
    await page.getByLabel('주소 검색').fill('서울 마포구 어울마당로 35');
    await page.getByRole('button', { name: '주소 선택' }).click();
    await expect(page.getByTestId('place-coords')).toHaveText('37.5509, 126.9219');
    await page.getByLabel('공연장 이름').fill('롤링홀');
    await page.getByLabel('문의처 유형 1').selectOption('INSTAGRAM');
    await page.getByLabel('문의처 1').fill('@gosrock');
    await page.getByRole('button', { name: '저장하기' }).click();
    await expect(page.getByRole('status')).toHaveText('저장했어요');

    // 상세 정보
    await menu(page).getByRole('link', { name: '상세 정보' }).click();
    await page.getByLabel('본문 1', { exact: true }).fill('<p>겨울 정기공연에 초대합니다</p>');
    await page.getByRole('button', { name: '저장하기' }).click();
    await expect(page.getByRole('status')).toHaveText('저장했어요');

    // ③ 티켓이 없어 2/3 — 등록할 수 없다
    await menu(page).getByRole('link', { name: '대시보드' }).click();
    await expect(page.getByTestId('checklist-progress')).toHaveText('2/3');
    await expect(page.getByRole('button', { name: '공연 등록하기' })).toBeDisabled();

    // 티켓 관리 → 두둥 티켓
    await menu(page).getByRole('link', { name: '티켓 관리' }).click();
    await page.getByRole('link', { name: '새 티켓 만들기' }).click();
    await fillDudoongForm(page, '일반 예매');
    await page.getByRole('button', { name: '티켓 만들기' }).click();
    await expect(card(page, '일반 예매')).toBeVisible();

    // ③이 찼다 → 등록
    await menu(page).getByRole('link', { name: '대시보드' }).click();
    await expect(page.getByTestId('checklist-progress')).toHaveText('3/3');
    await page.getByRole('button', { name: '공연 등록하기' }).click();
    await expect(page.getByTestId('registered-notice')).toHaveText('공연이 등록되었습니다.');
    await expect(menu(page)).toHaveCount(6);
    expect(await publicTicketIds(page, 7001)).toEqual([8101]);
  });
});
