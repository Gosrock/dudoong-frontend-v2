import path from 'node:path';

import { defineConfig } from '@playwright/test';

import { baseConfig } from '../playwright.config';

/**
 * QA 시나리오 설정(`pnpm qa <feature>` → qa/run.mjs가 QA_FEATURE·QA_REPORT_DIR를 넣어 부른다).
 * 앱·가짜 백엔드·뷰포트는 e2e 설정과 같다.
 */
const feature = process.env.QA_FEATURE ?? 'all';
const reportDir = path.resolve(
  process.env.QA_REPORT_DIR ?? path.join(__dirname, 'reports', feature, 'latest'),
);

export default defineConfig(baseConfig, {
  testDir: './scenarios',
  testMatch: feature === 'all' ? '**/*.qa.ts' : `${feature}.qa.ts`,
  outputDir: path.join(reportDir, 'test-results'),
  use: { trace: 'on', screenshot: 'only-on-failure' },
  reporter: [
    ['list'],
    ['./reporter.ts'],
    ['html', { outputFolder: path.join(reportDir, 'playwright'), open: 'never' }],
  ],
});
