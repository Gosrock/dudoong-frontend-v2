import type { StorybookConfig } from '@storybook/react-vite';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: { name: '@storybook/react-vite', options: {} },
  viteFinal: async (cfg) => {
    cfg.plugins = [...(cfg.plugins ?? []), vanillaExtractPlugin()];
    // @/* 별칭은 Vite 내장 tsconfig 경로 해석으로 푼다
    cfg.resolve = { ...cfg.resolve, tsconfigPaths: true };
    return cfg;
  },
};
export default config;
