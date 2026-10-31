import type { Page } from '@playwright/test';

import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { actAsRole } from '@/api/__mocks__/host-store';
import { hostingSets, resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { MOCK_S3_ORIGIN } from '@/api/__mocks__/upload-handlers';

import { setMockSession } from './support/auth';
import { expect, test } from './support/fixtures';

/**
 * P11-L 라우트 로직 — 간편 공연 만들기(`/hosting/new/events?step=`)·공연 스코프(`/hosting/events/[eventId]/…`)·
 * 대시보드 체크리스트·등록·기본 정보·상세 정보·공연 삭제. 호스팅 센터라 조회는 브라우저에서만 한다(셸만 렌더).
 * 최소 마크업이라 상태·요청 본문·메뉴만 본다(모양은 V). mock 저장소(`event-store.ts`)가 변경을 다음 조회에 반영한다 — 테스트마다 되돌린다.
 */
const resetStores = () => {
  resetHostMockState();
  resetHostingStore();
};
test.beforeEach(resetStores);
test.afterEach(resetStores);

const S3_CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'PUT',
  'access-control-allow-headers': 'content-type',
};

/** 가짜 S3(다른 출처)와 가짜 카카오맵 SDK(주소 → 좌표). 실제 SDK 동작 확인은 V */
async function routeExternal(page: Page) {
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
}

const PNG = { name: 'poster.png', mimeType: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4e]) };

const menu = (page: Page) =>
  page.getByRole('navigation', { name: '공연 메뉴' }).getByRole('listitem');

/** 간편 만들기 Step2를 채우고 만든다(티켓 없음) → 대시보드 */
async function createNoTicketEvent(page: Page, name = '여름 버스킹') {
  await page.getByLabel('공연 이름').fill(name);
  await page.getByLabel('날짜').fill('2030-05-01');
  await page.getByLabel('시작 시각').fill('19:00');
  await page.getByLabel('종료 시각').fill('21:00');
  await page.getByLabel('티켓 없음').check();
  await page.getByRole('button', { name: '공연 만들기' }).click();
}

test.describe('간편 공연 만들기', () => {
  test('일반 멤버인 호스트는 고를 수 없다 — 마스터 호스트를 골라 Step2 → 만들면 대시보드(?created=1)', async ({
    page,
    mockApi,
  }) => {
    mockApi.use(...hostingSets.mixedRoles);
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/new/events');
    await expect(page.getByLabel('소음공작소')).toBeDisabled();
    await expect(page.getByRole('button', { name: '다음' })).toBeDisabled();
    await page.getByLabel('고스락').check();
    await page.getByRole('button', { name: '다음' }).click();
    await expect(page).toHaveURL('/hosting/new/events?step=2');
    await expect(page.getByTestId('selected-host')).toHaveText('고스락');

    await createNoTicketEvent(page);
    await expect(page).toHaveURL(/\/hosting\/events\/7001\/dashboard\?created=1$/);
    await expect(page.getByTestId('created-notice')).toBeVisible();
    const create = mockApi.calls().filter((c) => c.method === 'POST');
    expect(create.map((c) => [c.from, c.path, c.status])).toEqual([
      ['browser', '/api/v2/events', 200],
    ]);
    // 서버는 /api를 부르지 않는다(셸만)
    expect(mockApi.calls().filter((c) => c.from === 'server')).toEqual([]);
  });

  test('Step1 안에서 호스트를 만들면 그 호스트가 골라진 채 ?step=2로 간다', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/new/events?step=1');
    await page.getByRole('button', { name: '새 호스트 만들기' }).click();
    await page.getByLabel('호스트 이름').fill('새 밴드');
    await page.getByLabel('연락처 유형 1').selectOption('INSTAGRAM');
    await page.getByLabel('연락처 1').fill('@newband');
    await page.getByRole('button', { name: '만들기' }).click();
    await expect(page).toHaveURL('/hosting/new/events?step=2');
    await expect(page.getByTestId('selected-host')).toHaveText('새 밴드');
    // 뒤로가기 = Step1, 만든 호스트가 골라져 있다
    await page.goBack();
    await expect(page.getByTestId('wizard-step')).toHaveText('1/2');
    await expect(page.getByLabel('새 밴드')).toBeChecked();
  });

  test('?step=2로 바로 들어오면(고른 호스트 없음) Step1로', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/new/events?step=2');
    await expect(page).toHaveURL('/hosting/new/events?step=1');
  });
});

test.describe('공연 스코프 — 접근', () => {
  test('비로그인이면 로그인으로 가고 돌아올 곳이 남는다', async ({ page }) => {
    await setMockSession(page, 'anonymous');
    await page.goto('/hosting/events/140/info');
    await expect(page).toHaveURL(
      `/login?redirect=${encodeURIComponent('/hosting/events/140/info')}`,
    );
  });

  test('비멤버는 공용 403 안내 — 서버는 /api를 부르지 않는다', async ({ page, mockApi }) => {
    await setMockSession(page, 'loggedIn');
    const res = await page.goto('/hosting/events/102/dashboard');
    expect(res?.status()).toBe(200);
    await expect(page.getByText('권한이 없어요')).toBeVisible();
    await expect(page.getByRole('link', { name: '공연준비 홈으로' })).toHaveAttribute(
      'href',
      '/hosting',
    );
    expect(mockApi.calls().filter((c) => c.from === 'server')).toEqual([]);
  });

  test('없는 공연·숫자가 아닌 id는 공용 404, /hosting/events/[id]는 대시보드로', async ({
    page,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/events/999999/info');
    await expect(page.getByText('찾을 수 없어요')).toBeVisible();
    await page.goto('/hosting/events/abc/dashboard');
    await expect(page.getByText('찾을 수 없어요')).toBeVisible();
    await page.goto('/hosting/events/140');
    await expect(page).toHaveURL('/hosting/events/140/dashboard');
  });

  test('일반 멤버는 읽기 전용 — 기본 정보·상세 정보에 저장 버튼이 없고, 대시보드에 [등록하기]가 없다', async ({
    page,
  }) => {
    actAsRole(11, 'GUEST');
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/events/140/info');
    await expect(page.getByTestId('read-only')).toHaveText(
      '일반 멤버는 공연 정보를 볼 수만 있어요',
    );
    await expect(page.getByLabel('공연 이름')).toHaveAttribute('readonly', '');
    await expect(page.getByRole('button', { name: '저장하기' })).toHaveCount(0);
    await page.goto('/hosting/events/140/detail');
    await expect(page.getByRole('heading', { name: '상세 정보' })).toBeVisible();
    await expect(page.getByRole('button', { name: '저장하기' })).toHaveCount(0);
    await page.goto('/hosting/events/140/dashboard');
    await expect(page.getByTestId('checklist-progress')).toBeVisible();
    await expect(page.getByRole('button', { name: '공연 등록하기' })).toHaveCount(0);
  });
});

test.describe('만들기 → 기본 정보 → 섹션 → 등록 완주(티켓 없음 공연)', () => {
  test('체크리스트를 채우면 등록 준비 완료, 등록하면 메뉴가 6개로 바뀌고 공연 상세가 열린다', async ({
    page,
    mockApi,
  }) => {
    await routeExternal(page);
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/new/events?hostId=11');
    await page.getByRole('button', { name: '다음' }).click();
    await createNoTicketEvent(page, '여름 버스킹');
    await expect(page).toHaveURL(/\/hosting\/events\/7001\/dashboard/);
    await expect(menu(page)).toHaveText(['대시보드', '기본 정보', '상세 정보', '티켓 관리']);
    await expect(page.getByTestId('checklist-progress')).toHaveText('1/3');
    await expect(page.getByTestId('checklist-ticket')).toContainText(
      '티켓 없는 공연이라 필요 없어요',
    );
    await expect(page.getByRole('button', { name: '공연 등록하기' })).toBeDisabled();

    // 기본 정보 — 포스터 · 장소(주소 → 좌표) · 문의처
    await menu(page).getByRole('link', { name: '기본 정보' }).click();
    await page.getByLabel('포스터 올리기').setInputFiles(PNG);
    await expect(page.getByTestId('poster').getByRole('img')).toHaveAttribute(
      'src',
      /\/event\/7001\/[0-9a-f-]{36}\.png$/,
    );
    await page.getByLabel('주소 검색').fill('서울 마포구 어울마당로 35');
    await page.getByRole('button', { name: '주소 선택' }).click();
    await expect(page.getByTestId('place-coords')).toHaveText('37.5509, 126.9219');
    await page.getByLabel('공연장 이름').fill('롤링홀');
    await page.getByLabel('상세주소').fill('지하 1층');
    await page.getByLabel('문의처 유형 1').selectOption('INSTAGRAM');
    await page.getByLabel('문의처 1').fill('@busking');
    const patch = page.waitForRequest(
      (r) => r.method() === 'PATCH' && r.url().endsWith('/api/v2/events/7001/basic'),
    );
    await page.getByRole('button', { name: '저장하기' }).click();
    expect((await patch).postDataJSON()).toEqual({
      posterImageKey: expect.stringMatching(/^event\/7001\/[0-9a-f-]{36}\.png$/),
      place: {
        name: '롤링홀',
        address: '서울 마포구 어울마당로 35',
        latitude: 37.5509,
        longitude: 126.9219,
        detailAddress: '지하 1층',
      },
      contacts: [{ type: 'INSTAGRAM', value: '@busking' }],
    });
    await expect(page.getByRole('status')).toHaveText('저장했어요');

    // 대시보드 — ①이 찼다
    await menu(page).getByRole('link', { name: '대시보드' }).click();
    await expect(page.getByTestId('checklist-basic')).toHaveAttribute('data-done', 'true');
    await expect(page.getByTestId('checklist-progress')).toHaveText('2/3');

    // 상세 정보 — 첫 탭 본문
    await menu(page).getByRole('link', { name: '상세 정보' }).click();
    await page.getByLabel('본문 1', { exact: true }).fill('<p>여름밤 버스킹에 초대합니다</p>');
    await page.getByRole('button', { name: '저장하기' }).click();
    await expect(page.getByRole('status')).toHaveText('저장했어요');

    // 대시보드 — 다 채운 순간(이 화면이 본 canOpen false → true)
    await menu(page).getByRole('link', { name: '대시보드' }).click();
    await expect(page.getByTestId('ready-notice')).toBeVisible();
    await expect(page.getByTestId('checklist-progress')).toHaveText('3/3');
    await page.getByRole('button', { name: '공연 등록하기' }).click();
    await expect(page.getByTestId('registered-notice')).toHaveText('공연이 등록되었습니다.');
    await expect(page.getByTestId('dashboard-registered')).toBeVisible();
    await expect(menu(page)).toHaveText([
      '대시보드',
      '기본 정보',
      '상세 정보',
      '티켓 관리',
      '예매자 관리',
      'QR 체크인',
    ]);
    expect(
      mockApi
        .calls()
        .filter((c) => c.method === 'POST' && c.path.endsWith('/open'))
        .map((c) => [c.path, c.status]),
    ).toEqual([['/api/v2/events/7001/open', 200]]);

    // 공연 상세(관객) — 저장·등록이 바로 반영돼 있다
    await page.getByRole('link', { name: '공연 페이지 보기' }).click();
    await expect(page).toHaveURL('/events/7001');
    await expect(page.getByRole('heading', { level: 1, name: '여름 버스킹' })).toBeVisible();
    await expect(page.getByText('여름밤 버스킹에 초대합니다').first()).toBeVisible();
  });
});

test.describe('등록된 공연 수정', () => {
  test('기본 정보: 등록된 공연을 저장하면 안내가 필요하다는 상태, 티켓 여부는 잠겨 있다', async ({
    page,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/events/101/info');
    await expect(page.getByTestId('has-ticket-locked')).toBeVisible();
    await expect(page.getByLabel('티켓 없음')).toBeDisabled();
    await page.getByLabel('공연 이름').fill('고스락 제37회 정기공연 (앵콜)');
    await page.getByRole('button', { name: '저장하기' }).click();
    await expect(page.getByTestId('registered-saved-notice')).toBeVisible();
    await page.goto('/events/101');
    await expect(
      page.getByRole('heading', { level: 1, name: '고스락 제37회 정기공연 (앵콜)' }),
    ).toBeVisible();
  });

  test('상세 정보: 섹션 저장은 전체 교체 — 뺀 탭은 공연 상세에서도 사라진다', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/events/101/detail');
    await expect(page.getByTestId('section')).toHaveCount(4);
    await page.getByRole('button', { name: '탭 삭제 3' }).click();
    const put = page.waitForRequest(
      (r) => r.method() === 'PUT' && r.url().endsWith('/api/v2/events/101/sections'),
    );
    await page.getByRole('button', { name: '저장하기' }).click();
    const body = (await put).postDataJSON() as { sections: { title: string; sortOrder: number }[] };
    expect(body.sections.map((s) => [s.title, s.sortOrder])).toEqual([
      ['공연 소개', 0],
      ['예매안내', 1],
      ['유의사항', 2],
    ]);
    await expect(page.getByTestId('registered-saved-notice')).toBeVisible();
    await page.goto('/events/101');
    await expect(page.getByRole('heading', { name: '유의사항', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '세트리스트', exact: true })).toHaveCount(0);
  });
});

test.describe('공연 삭제 — 준비중 카드 ⋮', () => {
  test('준비중 공연만 ⋮ [삭제]가 있고, 확인하면 목록에서 사라진다', async ({ page, mockApi }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting');
    const card = (name: string) => page.getByTestId('my-event').filter({ hasText: name });
    const menu = (name: string) => card(name).getByRole('button', { name: '공연 메뉴' });
    await expect(menu('고스락 신입 환영 공연(준비중)')).toBeVisible();
    await expect(menu('고스락 제37회 정기공연')).toHaveCount(0);
    await menu('고스락 신입 환영 공연(준비중)').click();
    await page.getByRole('menuitem', { name: '삭제' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: '삭제' }).click();
    await expect(card('고스락 신입 환영 공연(준비중)')).toHaveCount(0);
    expect(
      mockApi
        .calls()
        .filter((c) => c.method === 'DELETE')
        .map((c) => [c.path, c.status]),
    ).toEqual([['/api/v2/events/140', 200]]);
  });

  test('일반 멤버에게는 ⋮가 없다', async ({ page }) => {
    actAsRole(11, 'GUEST');
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting');
    await expect(page.getByTestId('my-event').first()).toBeVisible();
    await expect(page.getByRole('button', { name: '공연 메뉴' })).toHaveCount(0);
  });
});
