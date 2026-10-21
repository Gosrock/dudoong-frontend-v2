#!/usr/bin/env node
// pnpm dev:mock [next dev 인자...] — 백엔드 없이 개발 서버를 띄운다.
//
// 1. 가짜 백엔드(e2e/support/mock-backend.ts — `/api/*`를 MSW 기본 핸들러로 응답)를 MOCK_API_PORT(기본 4200)에 띄운다
// 2. `next dev`를 DEV_API_ORIGIN(브라우저 /api rewrite)과 API_INTERNAL_URL(서버 조회)이 그쪽을 향하게 띄운다
//    — 서버 조회는 rewrite를 타지 않으므로 둘 다 준다(tech-decisions §12)
// 둘 중 하나가 끝나면 다른 것도 끈다.
//
// 세션 흉내(plan P4a mock 3상태): 브라우저에서 아래 주소를 열면 쿠키와 dd:session을 세우고 ?redirect=로 돌아간다.
//   /api/__mock/login  로그인 · /api/__mock/expire 만료(재발급 성공) · /api/__mock/expire?refresh=fail 만료(재발급 실패)
//   /api/__mock/logout 비로그인. 공개 GET은 쿠키를 싣지 않으므로 계속 익명 값이다.
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

// mock 세션 3상태(plan P4a). 쿠키는 백엔드처럼 응답 Set-Cookie로, `dd:session`(세션 표시)은 같은 출처 HTML의
// 스크립트로 세운다 — 실제로는 로그인 콜백(P4b)이 세운다. 값은 src/api/__mocks__/respond.ts의 쿠키 규칙을 따른다.
const cookie = (name, value, maxAge) =>
  `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;
const safePath = (raw) =>
  typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('\\')
    ? raw
    : '/';
/** flag: 'new' = 새 무작위 값, 'keep' = 있으면 두고 없으면 새로, 'clear' = 지운다 */
const sessionPage = (request, cookies, flag) => {
  const to = safePath(new URL(request.url).searchParams.get('redirect'));
  const script =
    flag === 'clear'
      ? "localStorage.removeItem('dd:session');"
      : flag === 'keep'
        ? "if(!localStorage.getItem('dd:session'))localStorage.setItem('dd:session',crypto.getRandomValues(new Uint32Array(4)).join('-'));"
        : "localStorage.setItem('dd:session',crypto.getRandomValues(new Uint32Array(4)).join('-'));";
  const headers = new Headers({ 'content-type': 'text/html; charset=utf-8' });
  for (const c of cookies) headers.append('set-cookie', c);
  return new HttpResponse(
    `<!doctype html><meta charset="utf-8"><script>${script}location.replace(${JSON.stringify(to).replace(/</g, '\\u003c')})</script>`,
    { status: 200, headers },
  );
};
// reset()을 부르지 않으므로 계속 남는다
backend.use(
  // 로그인: 유효한 액세스·리프레시 쿠키 + 새 세션 표시
  http.get('*/api/__mock/login', ({ request }) =>
    sessionPage(
      request,
      [cookie('accessToken', 'mock', 86_400), cookie('refreshToken', 'mock-refresh', 86_400)],
      'new',
    ),
  ),
  // 만료: 액세스 쿠키 expired(보호 요청 401 AUTH_401_1). ?refresh=fail이면 리프레시 토큰도 무효(재발급 403)
  http.get('*/api/__mock/expire', ({ request }) => {
    const fail = new URL(request.url).searchParams.get('refresh') === 'fail';
    return sessionPage(
      request,
      [
        cookie('accessToken', 'expired', 86_400),
        cookie('refreshToken', fail ? 'revoked' : 'mock-refresh', 86_400),
      ],
      'keep',
    );
  }),
  // 비로그인: 쿠키와 세션 표시를 모두 지운다
  http.get('*/api/__mock/logout', ({ request }) =>
    sessionPage(request, [cookie('accessToken', '', 0), cookie('refreshToken', '', 0)], 'clear'),
  ),
);
console.log(
  `[dev:mock] 가짜 백엔드 ${MOCK_ORIGIN}/api (세션 흉내: /api/__mock/login · /api/__mock/expire[?refresh=fail] · /api/__mock/logout, 모두 ?redirect=/경로)`,
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
