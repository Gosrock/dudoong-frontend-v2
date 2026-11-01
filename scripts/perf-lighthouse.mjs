#!/usr/bin/env node
/**
 * 주요 라우트 Lighthouse(성능만) — 빌드한 standalone 서버 + 가짜 nginx/백엔드(e2e와 같은 구성, P14 성능).
 * 수치는 로컬 기계·모의 응답 기준이라 **전/후 비교용**이다. 운영 값이 아니다.
 *
 *   pnpm build
 *   LIGHTHOUSE_BIN=<lighthouse 실행 파일> CHROME_PATH=<Chromium> node scripts/perf-lighthouse.mjs [결과.json]
 *
 * Lighthouse는 의존성에 넣지 않는다(무겁고 게이트 밖) — `npm i lighthouse`를 저장소 밖에 설치해 `LIGHTHOUSE_BIN`으로 준다.
 * Chromium은 설치된 Chrome(`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`)을 준다.
 * 로그인 화면은 가짜 백엔드의 로그인 쿠키(`accessToken=mock`)를 헤더로 싣는다 — `dd:session`은 GM-1 성공 뒤 앱이 세운다.
 */
import './ts-import.mjs';

import { spawn } from 'node:child_process';
import { cpSync, writeFileSync } from 'node:fs';

const APP_PORT = 3300;
const MOCK_PORT = 4300;
const ORIGIN = `http://127.0.0.1:${MOCK_PORT}`;
const RUNS = Number(process.env.LH_RUNS ?? 3);
const out = process.argv[2];

const ROUTES = [
  { path: '/', label: '공연홈' },
  { path: '/events', label: '공연 리스트' },
  { path: '/events/101', label: '공연 상세' },
  { path: '/events/101/checkout?ticketItemId=501&quantity=1', label: '체크아웃', login: true },
  { path: '/tickets', label: '티켓탭', login: true },
  { path: '/hosting/events/101/dashboard', label: '호스팅 대시보드', login: true },
  { path: '/hosting/events/101/info', label: '호스팅 기본 정보', login: true },
  { path: '/hosting/events/101/tickets', label: '호스팅 티켓 관리', login: true },
];

const lighthouse = process.env.LIGHTHOUSE_BIN;
const chrome = process.env.CHROME_PATH;
if (!lighthouse || !chrome) {
  console.error('LIGHTHOUSE_BIN · CHROME_PATH가 필요하다(파일 머리 주석)');
  process.exit(1);
}

// 앞 실행이 남긴 서버가 포트를 잡고 있으면 옛 빌드를 재게 된다(청크 500 → NO_FCP)
for (const port of [APP_PORT, MOCK_PORT]) {
  const busy = await fetch(`http://127.0.0.1:${port}/healthz`).then(
    () => true,
    () => false,
  );
  if (busy) {
    console.error(
      `포트 ${port}를 이미 쓰고 있다 — 남은 서버를 끄고 다시 실행한다(lsof -nP -iTCP:${port})`,
    );
    process.exit(1);
  }
}

const { startMockBackend } = await import('../e2e/support/mock-backend.ts');
const backend = await startMockBackend({
  port: MOCK_PORT,
  appOrigin: `http://127.0.0.1:${APP_PORT}`,
});

// `pnpm start`와 같은 준비(standalone에 정적 파일 복사)
cpSync('public', '.next/standalone/public', { recursive: true });
cpSync('.next/static', '.next/standalone/.next/static', { recursive: true });
const app = spawn('node', ['.next/standalone/server.js'], {
  env: {
    ...process.env,
    PORT: String(APP_PORT),
    HOSTNAME: '127.0.0.1',
    API_INTERNAL_URL: `${ORIGIN}/api/v2`,
    NEXT_TELEMETRY_DISABLED: '1',
  },
  stdio: ['ignore', 'ignore', 'inherit'],
});

async function waitReady() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${ORIGIN}/healthz`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('서버가 뜨지 않았다');
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

// 가짜 백엔드가 이 프로세스 안에서 돌므로 spawnSync로 이벤트 루프를 막으면 안 된다
function run(cmd, args, env) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { env });
    const out = [];
    const err = [];
    p.stdout.on('data', (c) => out.push(c));
    p.stderr.on('data', (c) => err.push(c));
    p.on('close', (status) =>
      resolve({ status, stdout: Buffer.concat(out), stderr: Buffer.concat(err) }),
    );
  });
}

async function runOnce(route) {
  const args = [
    `${ORIGIN}${route.path}`,
    '--only-categories=performance',
    '--output=json',
    '--quiet',
    '--chrome-flags=--headless=new',
  ];
  if (route.login)
    args.push(
      `--extra-headers=${JSON.stringify({ Cookie: 'accessToken=mock; refreshToken=mock-refresh' })}`,
    );
  let r = await run(lighthouse, args, { ...process.env, CHROME_PATH: chrome });
  // 헤드리스 Chrome이 가끔 NO_FCP로 끝난다 — 한 번 더
  if (r.status !== 0) r = await run(lighthouse, args, { ...process.env, CHROME_PATH: chrome });
  if (r.status !== 0) throw new Error(`lighthouse 실패 ${route.path}: ${r.stderr}`);
  const lhr = JSON.parse(r.stdout.toString());
  const a = lhr.audits;
  return {
    score: Math.round(lhr.categories.performance.score * 100),
    fcp: a['first-contentful-paint'].numericValue,
    lcp: a['largest-contentful-paint'].numericValue,
    tbt: a['total-blocking-time'].numericValue,
    cls: a['cumulative-layout-shift'].numericValue,
    ttfb: a['server-response-time'].numericValue,
    jsKb:
      (a['resource-summary']?.details?.items ?? []).find((i) => i.resourceType === 'script')
        ?.transferSize / 1024,
  };
}

try {
  await waitReady();
  const results = [];
  for (const route of ROUTES) {
    await runOnce(route); // 데우기(서버 첫 렌더·캐시)
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await runOnce(route));
    const pick = (k) => median(runs.map((x) => x[k]));
    results.push({
      ...route,
      score: pick('score'),
      fcp: pick('fcp'),
      lcp: pick('lcp'),
      tbt: pick('tbt'),
      cls: pick('cls'),
      ttfb: pick('ttfb'),
      jsKb: pick('jsKb'),
    });
    console.error(`done ${route.path}`);
  }
  if (out) writeFileSync(out, JSON.stringify(results, null, 2));
  console.log('| 라우트 | 점수 | FCP | LCP | TBT | CLS | TTFB | JS 전송 KB |');
  console.log('|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const r of results) {
    const s = (ms) => `${(ms / 1000).toFixed(2)}s`;
    console.log(
      `| ${r.label} \`${r.path.split('?')[0]}\` | ${r.score} | ${s(r.fcp)} | ${s(r.lcp)} | ${Math.round(r.tbt)}ms | ${r.cls.toFixed(3)} | ${Math.round(r.ttfb)}ms | ${Math.round(r.jsKb)} |`,
    );
  }
} finally {
  app.kill();
  await backend.close();
}
