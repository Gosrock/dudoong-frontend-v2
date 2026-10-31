import { test as base } from '@playwright/test';

import { APP_ORIGIN, MOCK_PORT } from './env';
import { type MockBackend, startMockBackend } from './mock-backend';

type WorkerFixtures = { backend: MockBackend };
type TestFixtures = { mockApi: MockBackend; cspViolations: string[]; consolePii: string[] };

/**
 * 브라우저 콘솔(우리 `log()` · 처리 안 된 에러)에 나오면 안 되는 값(P14 보안 — 로그 PII). 가짜 백엔드 · 테스트가 쓰는 값이다:
 * 선물 · 체크인 토큰, 계좌번호, 입금자명, 전화번호(숫자만이든 하이픈이든), 쿠키 이름=값.
 */
const CONSOLE_PII: [string, RegExp][] = [
  ['선물 토큰', /mock-gift-[a-z-]+/],
  ['체크인 토큰', /mock-checkin-\d+/],
  ['계좌번호', /110-123-456789|110-987-654321|123456-78-901234|123-456-7890/],
  ['입금자명', /이서연엄마/],
  ['전화번호', /\b01[016789]-?\d{3,4}-?\d{4}\b/],
  ['토큰 쿠키', /(access|refresh)Token=/],
];

/**
 * 테스트용 가짜 출처(가짜 S3 등 — `*.mock.dudoong.test`). 운영 정책에 넣지 않으므로 위반에서 뺀다.
 * 실제 출처는 `src/utils/csp.ts`에 더한다 — 여기에 더하지 않는다.
 */
const TEST_ONLY_ORIGIN = /^https?:\/\/[a-z0-9-]+\.mock\.dudoong\.test(:\d+)?(\/|$)/;

/**
 * e2e·QA 공용 테스트. `mockApi.use(http.get(...))`로 이번 테스트의 백엔드 응답을 바꾼다 —
 * Next 서버의 서버 조회와 브라우저 요청 둘 다에 적용된다. 브라우저 요청만 바꾸려면 `page.route()`.
 * 핸들러가 없는 `/api` 요청이 있으면 테스트가 실패한다(vitest의 onUnhandledFrame: 'error'와 같은 취지).
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  backend: [
    async ({}, use) => {
      const backend = await startMockBackend({ port: MOCK_PORT, appOrigin: APP_ORIGIN });
      await use(backend);
      await backend.close();
    },
    { scope: 'worker', auto: true },
  ],
  mockApi: [
    async ({ backend }, use, testInfo) => {
      backend.reset();
      await use(backend);
      const unhandled = backend.unhandled();
      if (unhandled.length > 0 && testInfo.status === testInfo.expectedStatus) {
        throw new Error(
          `핸들러가 없는 API 요청: ${unhandled.map((c) => `${c.method} ${c.path} (${c.from})`).join(', ')}`,
        );
      }
    },
    { auto: true },
  ],
  /**
   * CSP 위반 0(P14 보안). 정책은 Report-Only라 막지 않지만 브라우저가 `securitypolicyviolation`을 낸다 — 모든 e2e·QA에서
   * 모아 하나라도 있으면 테스트를 실패시킨다. 새 외부 출처를 쓰면 `src/utils/csp.ts` 허용 목록부터 고친다.
   */
  cspViolations: [
    async ({ context }, use, testInfo) => {
      const found: string[] = [];
      await context.exposeBinding('__ddCspViolation', (_source, line: string) => {
        found.push(line);
      });
      await context.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (e) => {
          const report = (window as unknown as { __ddCspViolation?: (line: string) => void })
            .__ddCspViolation;
          report?.(`${e.effectiveDirective} ${e.blockedURI || '(none)'} @ ${location.pathname}`);
        });
      });
      await use(found);
      const real = found.filter((line) => !TEST_ONLY_ORIGIN.test(line.split(' ')[1] ?? ''));
      if (real.length > 0 && testInfo.status === testInfo.expectedStatus) {
        throw new Error(`CSP 위반(src/utils/csp.ts): ${[...new Set(real)].join(', ')}`);
      }
    },
    { auto: true },
  ],
  consolePii: [
    async ({ context }, use, testInfo) => {
      const found: string[] = [];
      const check = (where: string, text: string) => {
        for (const [what, re] of CONSOLE_PII) if (re.test(text)) found.push(`${what}(${where})`);
      };
      context.on('console', (msg) => check(`console.${msg.type()}`, msg.text()));
      context.on('weberror', (e) => check('pageerror', String(e.error())));
      await use(found);
      if (found.length > 0 && testInfo.status === testInfo.expectedStatus) {
        throw new Error(`콘솔에 개인정보 · 토큰: ${[...new Set(found)].join(', ')}`);
      }
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
