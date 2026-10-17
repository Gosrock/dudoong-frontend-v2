import path from 'node:path';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

/**
 * 두 프로젝트(tech-decisions §10).
 * - unit: 유닛·컴포넌트 통합(jsdom + MSW). `pnpm test` — PR 게이트
 * - storybook: 스토리마다 렌더 스모크 + play 함수(실제 Chromium). `pnpm test:stories` — 게이트 밖
 */
export default defineConfig({
  plugins: [react(), vanillaExtractPlugin()],
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(import.meta.dirname, '.storybook') })],
        // .css.ts가 런타임으로 불러오는 것. 실행 중에 발견되면 Vite가 다시 읽어 첫 실행이 실패한다
        optimizeDeps: {
          include: [
            '@vanilla-extract/recipes/createRuntimeFn',
            '@vanilla-extract/sprinkles/createRuntimeSprinkles',
          ],
        },
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
