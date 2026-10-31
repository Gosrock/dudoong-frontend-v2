import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';

import { server } from './src/api/__mocks__/server';
import { resetErrorToast } from './src/test/error-toast';

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
// 공용 에러 토스트 감시(src/test/error-toast.ts)
beforeEach(resetErrorToast);
afterEach(() => {
  server.resetHandlers();
  // vitest 전역(globals)을 쓰지 않아 Testing Library가 자동 정리를 붙이지 못한다
  cleanup();
});
afterAll(() => server.close());
