import { defineConfig, devices } from '@playwright/test';

import { APP_ORIGIN, APP_PORT, MOCK_ORIGIN, VIEWPORTS } from './e2e/support/env';

/**
 * e2e(`pnpm test:e2e`) 설정. QA 시나리오(`pnpm qa`)는 qa/playwright.config.ts가 이 값을 이어받는다.
 * e2e는 PR 게이트(`pr-gate.yml` `e2e` job, 3조각)에서도 돈다(P14 회귀, tech-decisions §10). QA 시나리오는 로컬·qa-scenario 스킬에서만.
 *
 * 빌드한 standalone 서버를 띄운다(운영과 같은 산출물). 백엔드는 워커 안의 가짜 백엔드(e2e/support)다.
 * `E2E_SKIP_BUILD=1`이면 이미 있는 `.next`를 그대로 띄운다.
 */
const skipBuild = process.env.E2E_SKIP_BUILD === '1';

export const baseConfig = defineConfig({
  // 가짜 백엔드가 포트 하나를 쓰고, 시나리오별 응답을 그 프로세스 상태로 바꾼다 — 병렬로 돌리지 않는다
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: MOCK_ORIGIN,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORTS.mobile,
        isMobile: true,
        hasTouch: true,
      },
    },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: VIEWPORTS.desktop } },
  ],
  webServer: {
    command: skipBuild ? 'pnpm start' : 'pnpm build && pnpm start',
    url: `${APP_ORIGIN}/healthz`,
    timeout: 240_000,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === '1',
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      PORT: String(APP_PORT),
      HOSTNAME: '127.0.0.1',
      API_INTERNAL_URL: `${MOCK_ORIGIN}/api/v2`,
      // 빌드 때 검증하는 공개 값. e2e는 카카오 SDK를 부르지 않는다
      NEXT_PUBLIC_KAKAO_JS_KEY: process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? 'e2e-placeholder',
      // QR 판독 주입(`dd:qr-scan`)을 켠 빌드 — 카메라 없는 hosting-checkin·hosting-qr이 쓴다. 운영 빌드에는 없다
      // (features/hosting/qr/ui/scan-injection.ts). E2E_SKIP_BUILD=1로 띄울 .next도 이 값으로 빌드돼 있어야 한다
      NEXT_PUBLIC_QR_SCAN_INJECTION: '1',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
});

export default defineConfig(baseConfig, {
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  outputDir: './test-results/e2e',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
});
