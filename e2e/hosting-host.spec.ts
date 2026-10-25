import type { Page } from '@playwright/test';

import { MISSING_HOST_ID } from '@/api/__mocks__/fixtures/host';
import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { actAsRole } from '@/api/__mocks__/host-store';
import { resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { MOCK_S3_ORIGIN } from '@/api/__mocks__/upload-handlers';

import { setMockSession } from './support/auth';
import { expect, test } from './support/fixtures';

/**
 * P10b-L 라우트 로직 — 호스트 설정(`/hosting/hosts/[hostId]/settings`)·멤버(`/hosting/hosts/[hostId]/members`).
 * 호스팅 센터라 조회는 브라우저에서만 한다(셸만 렌더). 최소 마크업이라 상태·요청·버튼 노출만 본다(모양은 V).
 * mock 저장소(`host-store.ts`)가 설정·멤버 변경을 다음 조회에 반영한다 — 테스트마다 되돌린다.
 */
const resetStores = () => {
  resetHostMockState();
  resetHostingStore();
};
test.beforeEach(resetStores);
// 다른 spec이 같은 워커에서 이어 돈다 — 바꾼 저장소를 남기지 않는다
test.afterEach(resetStores);

const S3_CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'PUT',
  'access-control-allow-headers': 'content-type',
};

/** 가짜 S3(다른 출처) — 브라우저의 PUT을 받아 기록한다 */
async function routeS3(page: Page) {
  const puts: { url: string; contentType: string | undefined }[] = [];
  await page.route(`${MOCK_S3_ORIGIN}/**`, async (route) => {
    const req = route.request();
    if (req.method() === 'PUT') {
      puts.push({ url: req.url(), contentType: req.headers()['content-type'] });
    }
    await route.fulfill({ status: 200, headers: S3_CORS, body: '' });
  });
  return puts;
}

const PNG = { name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4e]) };

test.describe('접근 — 실제 호스트 하위 라우트', () => {
  for (const sub of ['settings', 'members'] as const) {
    test(`${sub}: 비로그인이면 로그인으로 가고 돌아올 곳이 남는다`, async ({ page }) => {
      await setMockSession(page, 'anonymous');
      await page.goto(`/hosting/hosts/11/${sub}`);
      await expect(page).toHaveURL(
        `/login?redirect=${encodeURIComponent(`/hosting/hosts/11/${sub}`)}`,
      );
    });

    test(`${sub}: 비멤버는 공용 403 안내 — 서버는 /api를 부르지 않는다`, async ({
      page,
      mockApi,
    }) => {
      await setMockSession(page, 'loggedIn');
      const res = await page.goto(`/hosting/hosts/12/${sub}`);
      expect(res?.status()).toBe(200);
      await expect(page.getByText('권한이 없어요')).toBeVisible();
      await expect(page.getByRole('link', { name: '공연준비 홈으로' })).toHaveAttribute(
        'href',
        '/hosting',
      );
      expect(mockApi.calls().filter((c) => c.from === 'server')).toEqual([]);
    });

    test(`${sub}: 없는 호스트는 공용 404 안내`, async ({ page }) => {
      await setMockSession(page, 'loggedIn');
      await page.goto(`/hosting/hosts/${MISSING_HOST_ID}/${sub}`);
      await expect(page.getByText('찾을 수 없어요')).toBeVisible();
    });
  }
});

test.describe('호스트 설정', () => {
  test('이름을 바꿔 저장하면 바뀐 필드만 PH-4 — 공연준비 홈 호스트 카드에도 반영', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/hosts/11/settings');
    const name = page.getByLabel('호스트 이름');
    await expect(name).toHaveValue('고스락');
    await name.fill('고스락 밴드');
    await page.getByRole('button', { name: '저장' }).click();
    await expect(page.getByRole('status')).toHaveText('저장했어요');
    const writes = mockApi.calls().filter((c) => c.method !== 'GET');
    expect(writes.map((c) => [c.from, c.method, c.path, c.status])).toEqual([
      ['browser', 'PATCH', '/api/v2/hosts/11', 200],
    ]);
    await page.goto('/hosting?tab=hosts');
    await expect(page.getByTestId('my-host').getByRole('link')).toHaveText('고스락 밴드');
  });

  test('이미지: 발급(PH-15) → S3 PUT → 저장(PH-4 profileImageKey) → 새 이미지 주소', async ({
    page,
    mockApi,
  }) => {
    const puts = await routeS3(page);
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/hosts/11/settings');
    await page.getByLabel('프로필 이미지 올리기').setInputFiles(PNG);
    const profile = page.getByTestId('image-PROFILE').getByRole('img');
    await expect(profile).toHaveAttribute('src', /\/host\/11\/[0-9a-f-]{36}\.png$/);
    expect(puts).toEqual([
      { url: expect.stringMatching(/\/host\/11\/[0-9a-f-]{36}\.png\?/), contentType: 'image/png' },
    ]);
    await page.getByRole('button', { name: '저장' }).click();
    await expect(page.getByRole('status')).toHaveText('저장했어요');
    expect(
      mockApi
        .calls()
        .filter((c) => c.method !== 'GET')
        .map((c) => [c.method, c.path, c.status]),
    ).toEqual([
      ['POST', '/api/v2/hosts/11/images', 200],
      ['PATCH', '/api/v2/hosts/11', 200],
    ]);
    // 새로 열어도 저장된 이미지
    const src = await profile.getAttribute('src');
    await page.reload();
    await expect(page.getByTestId('image-PROFILE').getByRole('img')).toHaveAttribute('src', src!);
  });

  test('일반 멤버는 읽기 전용 — 저장 버튼이 없다', async ({ page }) => {
    actAsRole(11, 'GUEST');
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/hosts/11/settings');
    await expect(page.getByTestId('read-only')).toBeVisible();
    await expect(page.getByRole('button', { name: '저장' })).toHaveCount(0);
  });
});

/** 멤버 행 이름 → 역할 라벨 */
const roles = (page: Page) => page.getByTestId('member-role');
const row = (page: Page, name: string) =>
  page.getByTestId('member-row').filter({ has: page.getByText(name, { exact: true }) });

test.describe('멤버 관리 — 3시점', () => {
  test('마스터: 역할 변경·삭제·양도와 초대(역할 매니저·일반)가 보이고 권한 가이드에 "호스트 삭제"가 없다', async ({
    page,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/hosts/11/members');
    await expect(roles(page)).toHaveText(['마스터', '매니저', '일반', '일반']);
    await expect(row(page, '두둥이').getByRole('button')).toHaveCount(0);
    await expect(row(page, '이드럼').getByRole('button')).toHaveText([
      '매니저(으)로 변경',
      '삭제',
      '마스터 넘기기',
    ]);
    await expect(page.getByLabel('역할 1').locator('option')).toHaveText(['매니저', '일반']);
    await expect(page.getByLabel('역할 1')).toHaveValue('GUEST');
    const guide = page.getByRole('table', { name: '권한 가이드' });
    await expect(guide).toBeVisible();
    await expect(guide).not.toContainText('호스트 삭제');
  });

  test('매니저: 일반 멤버 삭제만, 초대 역할은 "일반" 고정', async ({ page }) => {
    actAsRole(11, 'MANAGER');
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/hosts/11/members');
    await expect(roles(page)).toHaveText(['마스터', '매니저', '일반', '일반']);
    await expect(row(page, '김매니저').getByRole('button')).toHaveCount(0);
    await expect(row(page, '두둥이').getByRole('button')).toHaveCount(0);
    await expect(row(page, '이드럼').getByRole('button')).toHaveText(['삭제']);
    await expect(page.getByLabel('역할 1').locator('option')).toHaveText(['일반']);
  });

  test('일반: 목록만 — 버튼·초대 없음', async ({ page }) => {
    actAsRole(11, 'GUEST');
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/hosts/11/members');
    await expect(roles(page)).toHaveCount(4);
    await expect(page.getByTestId('member-row').getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('form', { name: '멤버 초대' })).toHaveCount(0);
  });
});

test.describe('멤버 관리 — 변경', () => {
  test('초대: 한 줄이 실패하면 그 줄에 사유, 아무도 추가되지 않는다 — 고쳐서 다시 내면 추가', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/hosts/11/members');
    await page.getByRole('button', { name: '줄 추가' }).click();
    await page.getByLabel('초대할 이메일 1').fill('vocal@example.com');
    await page.getByLabel('초대할 이메일 2').fill('nobody@example.com');
    await page.getByRole('button', { name: '초대하기' }).click();
    const rows = page.getByTestId('invite-row');
    await expect(rows.nth(1).getByRole('alert')).toHaveText('가입되지 않은 이메일이에요');
    await expect(rows.nth(0).getByRole('alert')).toHaveCount(0);
    await expect(roles(page)).toHaveCount(4);
    await page.getByLabel('초대할 이메일 2').fill('guitar@example.com');
    await page.getByRole('button', { name: '초대하기' }).click();
    await expect(roles(page)).toHaveCount(6);
    await expect(page.getByTestId('invite-row')).toHaveCount(1);
    expect(
      mockApi
        .calls()
        .filter((c) => c.method === 'POST')
        .map((c) => [c.path, c.status]),
    ).toEqual([
      ['/api/v2/hosts/11/members', 400],
      ['/api/v2/hosts/11/members', 200],
    ]);
  });

  test('역할 변경: 일반 → 매니저, 응답 목록으로 바로 바뀐다(GH-6을 다시 읽지 않는다)', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/hosts/11/members');
    await row(page, '이드럼').getByRole('button', { name: '매니저(으)로 변경' }).click();
    await expect(row(page, '이드럼').getByTestId('member-role')).toHaveText('매니저');
    await expect(roles(page)).toHaveText(['마스터', '매니저', '매니저', '일반']);
    expect(
      mockApi.calls().filter((c) => c.path === '/api/v2/hosts/11/members' && c.method === 'GET'),
    ).toHaveLength(1);
  });

  test('삭제: 행이 사라진다', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/hosts/11/members');
    await row(page, '이드럼').getByRole('button', { name: '삭제' }).click();
    await expect(roles(page)).toHaveText(['마스터', '매니저', '일반']);
    await expect(row(page, '이드럼')).toHaveCount(0);
  });

  test('마스터 양도: 내가 매니저가 되고 버튼이 매니저 기준으로 바뀐다 — myRole 쿼리를 다시 읽는다', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/hosts/11/members');
    await row(page, '김매니저').getByRole('button', { name: '마스터 넘기기' }).click();
    await expect(row(page, '김매니저').getByTestId('member-role')).toHaveText('마스터');
    await expect(row(page, '두둥이').getByTestId('member-role')).toHaveText('매니저');
    await expect(page.getByRole('button', { name: '마스터 넘기기' })).toHaveCount(0);
    await expect(row(page, '이드럼').getByRole('button')).toHaveText(['삭제']);
    await expect(page.getByLabel('역할 1').locator('option')).toHaveText(['일반']);
    // GH-3 viewer를 다시 읽었다(처음 + 양도 뒤)
    expect(
      mockApi.calls().filter((c) => c.method === 'GET' && c.path === '/api/v2/hosts/11'),
    ).toHaveLength(2);
    // 공연준비 홈 호스트 카드도 매니저
    await page.goto('/hosting?tab=hosts');
    await expect(page.getByTestId('my-role')).toHaveText('MANAGER');
  });
});
