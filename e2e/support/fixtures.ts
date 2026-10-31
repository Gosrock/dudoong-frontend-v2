import { test as base } from '@playwright/test';

import { APP_ORIGIN, MOCK_PORT } from './env';
import { type MockBackend, startMockBackend } from './mock-backend';

type WorkerFixtures = { backend: MockBackend };
type TestFixtures = { mockApi: MockBackend };

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
});

export { expect } from '@playwright/test';
