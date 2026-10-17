#!/usr/bin/env node
// pnpm qa <feature> [--open] [playwright 인자...]
// 예: pnpm qa home / pnpm qa home --grep HOME-3 / E2E_SKIP_BUILD=1 pnpm qa home --open
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const feature = args[0] && !args[0].startsWith('-') ? args.shift() : 'all';
const open = args.includes('--open');
const rest = args.filter((a) => a !== '--open');

const root = path.dirname(new URL(import.meta.url).pathname);
if (feature !== 'all' && !fs.existsSync(path.join(root, 'scenarios', `${feature}.qa.ts`))) {
  const have = fs
    .readdirSync(path.join(root, 'scenarios'))
    .filter((f) => f.endsWith('.qa.ts'))
    .map((f) => f.replace(/\.qa\.ts$/, ''));
  console.error(`qa/scenarios/${feature}.qa.ts 가 없다. 있는 것: ${have.join(', ') || '(없음)'}`);
  process.exit(2);
}

// 2026-10-17T18-03-12 (로컬 시각)
const d = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
const reportDir = path.join(root, 'reports', feature, stamp);

const result = spawnSync(
  'pnpm',
  ['exec', 'playwright', 'test', '--config', path.join(root, 'playwright.config.ts'), ...rest],
  { stdio: 'inherit', env: { ...process.env, QA_FEATURE: feature, QA_REPORT_DIR: reportDir } },
);

const index = path.join(reportDir, 'index.html');
if (fs.existsSync(index)) {
  // 가장 최근 리포트를 latest로 가리킨다
  const latest = path.join(root, 'reports', feature, 'latest');
  fs.rmSync(latest, { force: true, recursive: true });
  fs.symlinkSync(stamp, latest);
  console.log(`\n리포트 열기: open ${path.relative(process.cwd(), index)}`);
  if (open) spawnSync('open', [index]);
}
process.exit(result.status ?? 1);
