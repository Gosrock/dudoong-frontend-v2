import type { StorybookConfig } from '@storybook/react-vite';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: { name: '@storybook/react-vite', options: {} },
  // 스토리를 Vitest 테스트로 돌린다(`pnpm test:stories`, tech-decisions §10)
  addons: ['@storybook/addon-vitest'],
  viteFinal: async (cfg) => {
    cfg.plugins = [...(cfg.plugins ?? []), vanillaExtractPlugin()];
    // @/* 별칭은 Vite 내장 tsconfig 경로 해석으로 푼다
    cfg.resolve = { ...cfg.resolve, tsconfigPaths: true };
    // next/link(src/ui의 링크·LinkProgress)가 process.env.__NEXT_* 를 읽는다. Next 밖(Vite)에는 process가 없다
    cfg.define = { ...cfg.define, 'process.env': {} };
    return cfg;
  },
};
export default config;
