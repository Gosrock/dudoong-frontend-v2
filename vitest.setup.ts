import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './src/api/__mocks__/server';

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
