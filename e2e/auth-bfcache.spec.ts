import { readSessionFlag, setMockSession } from './support/auth';
import { MOCK_ORIGIN } from './support/env';
import { expect, test } from './support/fixtures';

/**
 * 로그아웃 뒤 뒤로가기 — **실제 bfcache 복원**(plan P4b-L, tech-decisions §4 인증 표 "뒤로가기 캐시").
 *
 * Playwright는 Chromium을 `--disable-back-forward-cache`로 띄워 기본 e2e에서는 bfcache가 일어나지 않는다(auth.spec.ts).
 * 이 파일만 새 headless(`channel: 'chromium'`, 전체 Chrome)에서 그 인자를 빼 bfcache를 켠다. 브라우저 옵션이 달라
 * 별도 워커에서 돌고, 가짜 백엔드도 그 워커에서 다시 뜬다.
 */
test.use({
  channel: 'chromium',
  launchOptions: { ignoreDefaultArgs: ['--disable-back-forward-cache'] },
});

const LOGGED_IN_TEXT = '두둥이님으로 로그인했어요.';

test('로그아웃 뒤 뒤로가기로 bfcache에서 복원돼도 pageshow가 새로고침해 이전 사용자 화면이 남지 않는다', async ({
  page,
}) => {
  // 복원(persisted)을 기록한다 — pageshow 핸들러가 새로고침해도 남게 sessionStorage에
  await page.addInitScript(() => {
    addEventListener('pageshow', (e) => {
      if (e.persisted) sessionStorage.setItem('e2e:bfcache-restored', location.pathname);
    });
  });
  await setMockSession(page, 'loggedIn');
  await page.goto('/gate-check');
  await expect(page.getByText(LOGGED_IN_TEXT)).toBeVisible();

  await page.getByRole('button', { name: '로그아웃' }).click();
  await expect(page).toHaveURL(`${MOCK_ORIGIN}/`);
  expect(await readSessionFlag(page)).toBeNull();

  // bfcache 복원은 load를 다시 내지 않는다 — commit까지만 기다린다
  await page.goBack({ waitUntil: 'commit' });
  await expect(page).toHaveURL(/\/login\?redirect=%2Fgate-check$/);
  await expect(page.getByText(LOGGED_IN_TEXT)).toHaveCount(0);
  // 실제로 bfcache에서 복원됐었다(그래서 pageshow 핸들러가 새로고침했다)
  expect(await page.evaluate(() => sessionStorage.getItem('e2e:bfcache-restored'))).toBe(
    '/gate-check',
  );
});
