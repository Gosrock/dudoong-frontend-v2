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
          include: ['src/**/*.test.{ts,tsx}', 'tools/**/*.test.mjs'],
        },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(import.meta.dirname, '.storybook') })],
        // 스토리가 쓰는 의존성. 실행 중에 발견되면 Vite가 다시 최적화하며 페이지를 다시 읽어 첫 실행이 실패한다
        optimizeDeps: {
          include: [
            '@vanilla-extract/recipes/createRuntimeFn',
            '@vanilla-extract/sprinkles/createRuntimeSprinkles',
            'react-hook-form',
            '@hookform/resolvers/zod',
            'zod',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-select',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-visually-hidden',
            '@tanstack/react-table',
            'vaul',
            'sonner',
            'overlay-kit',
            'next/link',
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
