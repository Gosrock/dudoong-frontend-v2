#!/usr/bin/env node
// pnpm dev:mock [next dev 인자...] — 백엔드 없이 개발 서버를 띄운다.
//
// 1. 가짜 백엔드(e2e/support/mock-backend.ts — `/api/*`를 MSW 기본 핸들러로 응답)를 MOCK_API_PORT(기본 4200)에 띄운다
// 2. `next dev`를 DEV_API_ORIGIN(브라우저 /api rewrite)과 API_INTERNAL_URL(서버 조회)이 그쪽을 향하게 띄운다
//    — 서버 조회는 rewrite를 타지 않으므로 둘 다 준다(tech-decisions §12)
// 둘 중 하나가 끝나면 다른 것도 끈다.
//
// 로그인 흉내: 브라우저에서 /api/__mock/login 을 열면 accessToken 쿠키가 생긴다(viewer 쿼리·GM-1이 로그인 값을 받는다).
// /api/__mock/logout 은 지운다. 공개 GET은 쿠키를 싣지 않으므로 계속 익명 값이다.
import './ts-import.mjs';

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { http, HttpResponse } from 'msw';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { startMockBackend } = await import('../e2e/support/mock-backend.ts');

const MOCK_PORT = Number(process.env.MOCK_API_PORT ?? 4200);
const APP_PORT = Number(process.env.PORT ?? 3000);
const MOCK_ORIGIN = `http://127.0.0.1:${MOCK_PORT}`;

const backend = await startMockBackend({
  port: MOCK_PORT,
  appOrigin: `http://127.0.0.1:${APP_PORT}`,
});

const sessionCookie = (value, maxAge) =>
  `accessToken=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;
// reset()을 부르지 않으므로 계속 남는다
backend.use(
  http.get(
    '*/api/__mock/login',
    () =>
      new HttpResponse(null, {
        status: 302,
        headers: { location: '/', 'set-cookie': sessionCookie('mock', 86_400) },
      }),
  ),
  http.get(
    '*/api/__mock/logout',
    () =>
      new HttpResponse(null, {
        status: 302,
        headers: { location: '/', 'set-cookie': sessionCookie('', 0) },
      }),
  ),
);
console.log(
  `[dev:mock] 가짜 백엔드 ${MOCK_ORIGIN}/api (로그인 흉내: /api/__mock/login · /api/__mock/logout)`,
);

// 핸들러가 없는 요청은 MOCK_UNHANDLED(500)로 응답한다 — 알아차리게 찍는다
let reported = 0;
const unhandledTimer = setInterval(() => {
  const list = backend.unhandled();
  for (const call of list.slice(reported)) {
    console.warn(`[dev:mock] 핸들러 없음: ${call.method} ${call.path} (${call.from})`);
  }
  reported = list.length;
}, 1000);

// 카카오 키는 next.config.ts가 빌드 때 검증한다. .env.local 등에 있으면 그 값을 쓰고, 없을 때만 자리 값을 준다
const hasKakaoKey =
  !!process.env.NEXT_PUBLIC_KAKAO_JS_KEY ||
  ['.env.local', '.env.development.local', '.env.development', '.env'].some((f) => {
    const file = path.join(root, f);
    return (
      existsSync(file) && /^\s*NEXT_PUBLIC_KAKAO_JS_KEY\s*=\s*\S/m.test(readFileSync(file, 'utf8'))
    );
  });
if (!hasKakaoKey)
  console.log(
    '[dev:mock] NEXT_PUBLIC_KAKAO_JS_KEY가 없어 자리 값을 쓴다(카카오 SDK는 동작하지 않는다)',
  );

const next = spawn(
  'pnpm',
  ['exec', 'next', 'dev', '--port', String(APP_PORT), ...process.argv.slice(2)],
  {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      DEV_API_ORIGIN: MOCK_ORIGIN,
      API_INTERNAL_URL: `${MOCK_ORIGIN}/api/v2`,
      ...(hasKakaoKey ? {} : { NEXT_PUBLIC_KAKAO_JS_KEY: 'dev-mock-placeholder' }),
    },
  },
);

let closing = false;
async function shutdown(code) {
  if (closing) return;
  closing = true;
  clearInterval(unhandledTimer);
  if (next.exitCode === null) next.kill('SIGTERM');
  await backend.close();
  process.exit(code);
}

next.on('exit', (code) => void shutdown(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => void shutdown(0));
}
