import type { Page } from '@playwright/test';
import { http } from 'msw';

import { authHandlers } from '@/api/__mocks__/auth.handlers';
import { meHandlers } from '@/api/__mocks__/me.handlers';
import { ok } from '@/api/__mocks__/respond';

import { readSessionFlag, setMockSession } from './support/auth';
import { MOCK_ORIGIN } from './support/env';
import { expect, test } from './support/fixtures';

/**
 * 인증 라우트 로직(plan P4b-L) — 카카오 콜백 성공·실패 이동, redirect 복귀, 오픈 리다이렉트 차단, SameSite=Strict, bfcache.
 * 카카오는 가짜 인증 화면(`/api/__mock/kakao/authorize`, `src/api/__mocks__/auth.handlers.ts`)이 대신한다. 캡처는 없다(V).
 * 보호 화면은 임시 라우트 `/gate-check`(P4a)다.
 */

const LOGGED_IN_TEXT = '두둥이님으로 로그인했어요.';
const here = (page: Page) => new URL(page.url());

/** 로그인 화면에서 [카카오 로그인] → 가짜 카카오에서 고른다 */
async function loginWithKakao(page: Page, choice: string) {
  await page.getByRole('button', { name: '카카오 로그인/회원가입' }).click();
  await expect(page.getByRole('heading', { name: '가짜 카카오 로그인' })).toBeVisible();
  await page.getByRole('link', { name: choice, exact: true }).click();
}

test.describe('카카오 로그인 콜백', () => {
  test('비로그인으로 보호 화면에 들어와 기존 사용자로 로그인하면 원래 화면으로 돌아온다', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'anonymous');
    await page.goto('/gate-check?tab=1');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fgate-check%3Ftab%3D1$/);

    await loginWithKakao(page, '기존 사용자로 로그인');

    await expect(page.getByText(LOGGED_IN_TEXT)).toBeVisible();
    expect(`${here(page).pathname}${here(page).search}`).toBe('/gate-check?tab=1');
    expect(await readSessionFlag(page)).not.toBeNull();
    // 콜백 주소(쓴 인가 코드)는 기록에 남지 않는다 — 뒤로 가면 카카오 화면
    await page.goBack();
    await expect(page.getByRole('heading', { name: '가짜 카카오 로그인' })).toBeVisible();

    const auth = mockApi
      .calls()
      .filter((c) => c.path.startsWith('/api/v1/auth/'))
      .map((c) => `${c.method} ${c.path.split('?')[0]} ${c.status}`);
    expect(auth).toEqual([
      'GET /api/v1/auth/oauth/kakao/link 200',
      'GET /api/v1/auth/oauth/kakao 200',
      'POST /api/v1/auth/oauth/kakao/register/valid 200',
      'POST /api/v1/auth/oauth/kakao/login 200',
    ]);
  });

  test('신규 사용자는 가입 폼(필수 동의)을 거쳐 원래 화면으로 돌아온다', async ({ page }) => {
    await setMockSession(page, 'anonymous');
    await page.goto('/gate-check');
    await loginWithKakao(page, '신규 사용자(가입)');

    await expect(page).toHaveURL(/\/kakao\/callback\?/);
    await expect(page.getByRole('heading', { name: '회원가입' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: '이름' })).toHaveValue('새내기');
    const submit = page.getByRole('button', { name: '동의하고 시작하기' });
    await expect(submit).toBeDisabled();
    await page.getByRole('checkbox', { name: '(필수) 서비스 이용약관 동의' }).check();
    await page.getByRole('checkbox', { name: '(필수) 개인정보 처리방침 동의' }).check();
    await submit.click();

    await expect(page).toHaveURL(/\/gate-check$/);
    await expect(page.getByText(LOGGED_IN_TEXT)).toBeVisible();
  });

  test('정지 계정이면 "이용이 제한된 계정이에요"가 뜨고 로그인되지 않는다', async ({ page }) => {
    await setMockSession(page, 'anonymous');
    await page.goto('/login?redirect=%2Fgate-check');
    await loginWithKakao(page, '정지 계정');

    await expect(
      page.getByRole('alert').filter({ hasText: '이용이 제한된 계정이에요.' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/kakao\/callback\?/);
    expect(await readSessionFlag(page)).toBeNull();
    await expect(page.getByRole('link', { name: '다시 로그인' })).toHaveAttribute(
      'href',
      '/login?redirect=%2Fgate-check',
    );
  });

  test('state 불일치(AUTH_400_1)면 돌아올 곳을 유지한 채 로그인 화면으로 돌아온다', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'anonymous');
    await page.goto('/login?redirect=%2Fgate-check');
    await loginWithKakao(page, 'state 불일치');

    await expect(page).toHaveURL(/\/login\?redirect=%2Fgate-check$/);
    await expect(page.getByRole('button', { name: '카카오 로그인/회원가입' })).toBeEnabled();
    const exchange = mockApi.calls().filter((c) => c.path.startsWith('/api/v1/auth/oauth/kakao?'));
    expect(exchange.map((c) => c.status)).toEqual([400]);
    expect(await readSessionFlag(page)).toBeNull();
  });

  test('카카오에서 동의를 취소하면 요청 없이 로그인 화면으로 돌아온다', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'anonymous');
    await page.goto('/login?redirect=%2Fgate-check');
    await loginWithKakao(page, '동의 취소');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fgate-check$/);
    expect(mockApi.calls().filter((c) => c.path.startsWith('/api/v1/auth/oauth/kakao?'))).toEqual(
      [],
    );
  });

  test('콜백이 401(낡은 액세스 쿠키)이면 "잠시 후 다시 시도해 주세요"', async ({
    page,
    mockApi,
  }) => {
    mockApi.use(...authHandlers.kakaoExchangeStaleAccess);
    await setMockSession(page, 'anonymous');
    await page.goto('/login');
    await loginWithKakao(page, '기존 사용자로 로그인');
    await expect(
      page.getByRole('alert').filter({ hasText: '잠시 후 다시 시도해 주세요.' }),
    ).toBeVisible();
    expect(await readSessionFlag(page)).toBeNull();
  });

  test('로그인 화면의 링크 발급이 401이면 "잠시 후 다시 시도해 주세요"이고 이동하지 않는다', async ({
    page,
    mockApi,
  }) => {
    mockApi.use(...authHandlers.kakaoLinkStaleAccess);
    await setMockSession(page, 'anonymous');
    await page.goto('/login');
    await page.getByRole('button', { name: '카카오 로그인/회원가입' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: '잠시 후 다시 시도해 주세요.' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('오픈 리다이렉트 차단', () => {
  for (const evil of [
    'https://evil.example/steal',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
  ]) {
    test(`redirect=${evil} 로 로그인하면 우리 사이트 / 로 간다`, async ({ page }) => {
      await setMockSession(page, 'anonymous');
      await page.goto(`/login?redirect=${encodeURIComponent(evil)}`);
      await loginWithKakao(page, '기존 사용자로 로그인');
      await expect(page).toHaveURL(`${MOCK_ORIGIN}/`);
    });
  }
});

test.describe('세션 상태별 보호 화면 진입', () => {
  test('만료 상태(재발급 성공)에서 보호 화면에 들어가면 재발급 뒤 화면이 정상 렌더', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'expired');
    await page.goto('/gate-check');
    await expect(page.getByText(LOGGED_IN_TEXT)).toBeVisible();
    await expect(page).toHaveURL(/\/gate-check$/);
    expect(
      mockApi.calls().filter((c) => c.path.startsWith('/api/v1/auth/token/refresh')).length,
    ).toBe(1);
  });

  test('정지·탈퇴 계정의 토큰(익명 처리 → 재발급 USER_403_1)이면 로그인 화면(/login/expired)으로 수렴한다', async ({
    page,
    mockApi,
  }) => {
    mockApi.use(...meHandlers.anonymous, ...authHandlers.refreshSuspended);
    await setMockSession(page, 'loggedIn');
    await page.goto('/gate-check');
    await expect(page).toHaveURL(/\/login\/expired\?redirect=%2Fgate-check$/);
    await expect(page.getByRole('heading', { name: '로그인이 만료됐어요' })).toBeVisible();
    expect(await readSessionFlag(page)).toBeNull();
  });
});

test.describe('로그아웃 뒤 뒤로가기(bfcache)', () => {
  /** 복원(persisted)을 기록한다 — pageshow 핸들러가 새로고침해도 남게 sessionStorage에 */
  const markRestores = (page: Page) =>
    page.addInitScript(() => {
      addEventListener('pageshow', (e) => {
        if (e.persisted) sessionStorage.setItem('e2e:bfcache-restored', location.pathname);
      });
    });
  const restoredPath = (page: Page) =>
    page.evaluate(() => sessionStorage.getItem('e2e:bfcache-restored'));

  test('(bfcache 꺼진 기본 Chromium) 로그아웃하고 뒤로 가도 이전 사용자 화면이 보이지 않는다', async ({
    page,
  }) => {
    await markRestores(page);
    await setMockSession(page, 'loggedIn');
    await page.goto('/gate-check');
    await expect(page.getByText(LOGGED_IN_TEXT)).toBeVisible();

    await page.getByRole('button', { name: '로그아웃' }).click();
    await expect(page).toHaveURL(`${MOCK_ORIGIN}/`);

    // Playwright는 Chromium을 --disable-back-forward-cache로 띄운다 — 새로 읽고 게이트가 로그인으로 보낸다
    await page.goBack();
    await expect(page).toHaveURL(/\/login\?redirect=%2Fgate-check$/);
    await expect(page.getByText(LOGGED_IN_TEXT)).toHaveCount(0);
    expect(await restoredPath(page)).toBeNull();
  });
  // 실제 bfcache 복원은 e2e/auth-bfcache.spec.ts(브라우저 옵션이 달라 파일을 나눴다)
});

test.describe('SameSite=Strict(운영 쿠키) 재현', () => {
  /** 다른 사이트 흉내. 127.0.0.1과 사이트가 다르다(등록 도메인이 다름) */
  const EXTERNAL = 'http://external.example';
  const KAUTH = 'http://kauth.example';

  test.beforeEach(async ({ page, mockApi }) => {
    mockApi.setTokenCookieSameSite('Strict');
    await page.route(`${EXTERNAL}/**`, (route) =>
      route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: `<!doctype html><meta charset="utf-8"><a href="${MOCK_ORIGIN}/gate-check">두둥 공연 보러 가기</a>`,
      }),
    );
    // 카카오 인증 화면을 다른 사이트에 두고 바로 콜백으로 돌려보낸다(카카오가 하는 cross-site 302)
    await page.route(`${KAUTH}/**`, (route) => {
      const url = new URL(route.request().url());
      const back = new URL(url.searchParams.get('redirect_uri') ?? `${MOCK_ORIGIN}/kakao/callback`);
      back.searchParams.set('code', 'mock-existing');
      back.searchParams.set('state', url.searchParams.get('state') ?? '');
      return route.fulfill({ status: 302, headers: { location: back.toString() } });
    });
    mockApi.use(
      http.get('*/api/v1/auth/oauth/kakao/link', () => {
        const state = 'strict-state';
        const res = ok({
          link: `${KAUTH}/oauth/authorize?redirect_uri=${encodeURIComponent(`${MOCK_ORIGIN}/kakao/callback`)}&state=${state}`,
        });
        res.headers.append(
          'set-cookie',
          `oauth_state=${state}; Path=/; Max-Age=600; HttpOnly; SameSite=Lax`,
        );
        return res;
      }),
    );
  });

  test('외부 링크로 보호 화면에 들어와 카카오 로그인하면 복귀 직후 로그인이 유지되고, 다시 외부 링크로 와도 유지된다', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'anonymous');

    // 1) 외부 사이트 → 보호 화면 → 게이트가 로그인으로
    await page.goto(EXTERNAL);
    await page.getByRole('link', { name: '두둥 공연 보러 가기' }).click();
    await expect(page).toHaveURL(/\/login\?redirect=%2Fgate-check$/);

    // 2) 카카오(다른 사이트)에서 복귀 → 콜백 → 로그인 → 원래 화면
    await page.getByRole('button', { name: '카카오 로그인/회원가입' }).click();
    await expect(page.getByText(LOGGED_IN_TEXT)).toBeVisible();
    await expect(page).toHaveURL(/\/gate-check$/);
    const tokenCookies = (await page.context().cookies(MOCK_ORIGIN)).filter((c) =>
      ['accessToken', 'refreshToken'].includes(c.name),
    );
    expect(tokenCookies.map((c) => `${c.name} ${c.sameSite}`).sort()).toEqual([
      'accessToken Strict',
      'refreshToken Strict',
    ]);

    // 3) 다시 외부 링크로 들어온다 — 문서 요청에는 Strict 쿠키가 실리지 않지만 게이트의 GM-1(같은 사이트 fetch)에는 실린다
    mockApi.reset();
    mockApi.setTokenCookieSameSite('Strict');
    await page.goto(EXTERNAL);
    const navigation = page.waitForRequest(
      (r) => r.isNavigationRequest() && r.url() === `${MOCK_ORIGIN}/gate-check`,
    );
    await page.getByRole('link', { name: '두둥 공연 보러 가기' }).click();
    const documentCookie = (await (await navigation).allHeaders()).cookie ?? '';
    expect(documentCookie).not.toContain('accessToken=');
    await expect(page.getByText(LOGGED_IN_TEXT)).toBeVisible();
    await expect(page).toHaveURL(/\/gate-check$/);
    expect(
      mockApi
        .calls()
        .filter((c) => c.path.startsWith('/api/v2/me'))
        .map((c) => `${c.from} ${c.status}`),
    ).toEqual(['browser 200']);
  });
});
