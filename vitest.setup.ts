import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './src/api/__mocks__/server';

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  server.resetHandlers();
  // vitest 전역(globals)을 쓰지 않아 Testing Library가 자동 정리를 붙이지 못한다
  cleanup();
});
afterAll(() => server.close());
