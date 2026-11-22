import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { MOCK_INVITE_TOKEN } from '@/api/__mocks__/host-store';

import { setMockSession } from './support/auth';
import { expect, test } from './support/fixtures';

/**
 * 호스트 초대 수락 `/host-invitations/{token}`(H-19 · H-20, B33② · 백엔드 #933 — Api 2.5.7). 로그인 필요, GUI(#267 — 모바일 Ready).
 * 토큰 보호: 진입 직후 주소에서 지우고, 로그인으로 갈 때만 탭 저장소에, `redirect`에는 토큰 없는 경로만, Referer 없음.
 */
test.beforeEach(() => resetHostMockState());
test.afterEach(() => resetHostMockState());

const TOKEN = MOCK_INVITE_TOKEN.valid;

test.describe('토큰 보호', () => {
  test('로그인 사용자 — 주소에서 토큰이 바로 사라지고, 어떤 요청의 Referer에도 토큰이 없다', async ({
    page,
  }) => {
    // 서버 HTML의 <head>가 바로 부르는 같은 출처 정적 파일(`/_next/static`)은 주소를 지우기 전이라 Referer에 토큰이 실린다 —
    // 같은 출처 · 요청 줄에 이미 토큰이 있는 nginx 로그 말고는 가지 않는다(B43). 하이드레이션 뒤 요청(API 등)에는 없어야 한다
    const referers: string[] = [];
    page.on('request', (req) => {
      const referer = req.headers()['referer'];
      if (referer && !new URL(req.url()).pathname.startsWith('/_next/static/')) {
        referers.push(`${req.url()} ← ${referer}`);
      }
    });
    await setMockSession(page, 'loggedIn');
    const res = await page.goto(`/host-invitations/${TOKEN}`);
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(/\/host-invitations$/);
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
    await expect(
      page.getByRole('heading', { name: '‘소음공작소’에서 일반 멤버로 초대했어요' }),
    ).toBeVisible();
    expect(referers.filter((r) => r.includes(TOKEN))).toEqual([]);
    // 기록에도 토큰 주소가 없다(replace) — 뒤로 가면 들어오기 전 화면
    await page.goBack();
    expect(page.url()).not.toContain(TOKEN);
  });

  test('익명 — 토큰 없는 경로로 로그인에 가고, 로그인 뒤 돌아오면 저장소에서 꺼내 지운다', async ({
    page,
  }) => {
    await setMockSession(page, 'anonymous');
    await page.goto(`/host-invitations/${TOKEN}`);
    await expect(page).toHaveURL(`/login?redirect=${encodeURIComponent('/host-invitations')}`);
    expect(page.url()).not.toContain(TOKEN);
    expect(await page.evaluate(() => sessionStorage.getItem('dd:hostInvitation'))).toBe(TOKEN);

    // 카카오 로그인 왕복 대신 세션을 세우고 돌아올 곳으로
    await setMockSession(page, 'loggedIn');
    await page.goto('/host-invitations');
    await expect(
      page.getByRole('heading', { name: '‘소음공작소’에서 일반 멤버로 초대했어요' }),
    ).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem('dd:hostInvitation'))).toBeNull();
  });

  test('토큰을 지운 뒤 새로고침하면 "초대 링크를 다시 열어 주세요"(토큰은 메모리에만)', async ({
    page,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(`/host-invitations/${TOKEN}`);
    await expect(page).toHaveURL(/\/host-invitations$/);
    await page.reload();
    await expect(page.getByText('초대 링크를 다시 열어 주세요')).toBeVisible();
  });
});

test.describe('수락', () => {
  test('[수락하기] → H-20 → "멤버가 됐어요" · [호스트 홈으로 가기]', async ({ page, mockApi }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(`/host-invitations/${TOKEN}`);
    await expect(page.getByText('ne***@example.com')).toBeVisible();
    await page.getByRole('button', { name: '수락하기' }).click();
    await expect(
      page.getByRole('heading', { name: '‘소음공작소’의 멤버가 됐어요!' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: '호스트 홈으로 가기' })).toHaveAttribute(
      'href',
      /^\/hosts\/\d+$/,
    );
    const posts = mockApi.calls().filter((c) => c.method === 'POST');
    expect(posts.map((c) => [c.path.replace(TOKEN, '{token}'), c.status])).toEqual([
      ['/api/v2/host-invitations/{token}/accept', 200],
    ]);
  });

  test('이미 멤버면 [수락하기] 없이 바로 "이미 멤버" 결과 — 수락은 스스로 한 번 불러 초대를 소비한다', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(`/host-invitations/${MOCK_INVITE_TOKEN.member}`);
    await expect(page.getByRole('heading', { name: '이미 ‘고스락’의 멤버예요' })).toBeVisible();
    await expect(page.getByRole('link', { name: '호스트 홈으로 가기' })).toHaveAttribute(
      'href',
      '/hosts/11',
    );
    await expect(page.getByRole('button', { name: '수락하기' })).toHaveCount(0);
    // 초대를 남기지 않는다(링크 소지가 자격 — 만료 전까지 다른 사람이 쓰지 못하게, tap-review #271)
    await expect
      .poll(() =>
        mockApi
          .calls()
          .filter((c) => c.method === 'POST')
          .map((c) => [c.path.replace(MOCK_INVITE_TOKEN.member, '{token}'), c.status]),
      )
      .toEqual([['/api/v2/host-invitations/{token}/accept', 200]]);
  });

  for (const [token, title] of [
    [MOCK_INVITE_TOKEN.expired, '만료된 초대장이에요'],
    [MOCK_INVITE_TOKEN.used, '이미 사용된 초대장이에요'],
    [MOCK_INVITE_TOKEN.missing, '초대장을 찾을 수 없어요'],
  ] as const) {
    test(`쓸 수 없는 초대 → "${title}"`, async ({ page }) => {
      await setMockSession(page, 'loggedIn');
      await page.goto(`/host-invitations/${token}`);
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
      await expect(page.getByRole('link', { name: '두둥 홈으로 가기' })).toHaveAttribute(
        'href',
        '/',
      );
      await expect(page.getByRole('button', { name: '수락하기' })).toHaveCount(0);
    });
  }
});

/** 거절(H-21 — Api 2.5.16, #348 B72). GUI `1427:4596` [거절하기] · 확인 `1470:5877` · 완료 `1470:5905` */
test.describe('거절', () => {
  test('[거절하기] → 확인 창 → H-21 → "초대를 거절했어요" · [호스트 홈으로 가기], 같은 링크는 이미 사용됨', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(`/host-invitations/${TOKEN}`);
    await page.getByRole('button', { name: '거절하기' }).click();
    const confirm = page.getByRole('alertdialog', { name: '초대를 거절할까요?' });
    await expect(confirm).toContainText('거절하면 이 초대 링크는 다시 쓸 수 없어요.');
    // [취소]는 아무것도 보내지 않는다
    await confirm.getByRole('button', { name: '취소' }).click();
    await expect(confirm).toHaveCount(0);
    expect(mockApi.calls().filter((c) => c.method === 'POST')).toEqual([]);
    await page.getByRole('button', { name: '거절하기' }).click();
    await page
      .getByRole('alertdialog', { name: '초대를 거절할까요?' })
      .getByRole('button', { name: '거절하기' })
      .click();
    await expect(page.getByRole('heading', { name: '초대를 거절했어요' })).toBeVisible();
    await expect(page.getByText('다시 참여하려면 호스트에게 새 초대를 요청해 주세요.')).toBeVisible();
    await expect(page.getByRole('link', { name: '호스트 홈으로 가기' })).toHaveAttribute(
      'href',
      '/hosts/12',
    );
    const posts = mockApi.calls().filter((c) => c.method === 'POST');
    expect(posts.map((c) => [c.path.replace(TOKEN, '{token}'), c.status])).toEqual([
      ['/api/v2/host-invitations/{token}/reject', 200],
    ]);
    await page.goto(`/host-invitations/${TOKEN}`);
    await expect(page.getByRole('heading', { name: '이미 사용된 초대장이에요' })).toBeVisible();
  });
});
