import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';

import { server } from './src/api/__mocks__/server';
import { resetErrorToast } from './src/test/error-toast';

// jsdom에 없는 브라우저 API — Radix Tooltip(늘 열린 말풍선, P4b-V 로그인)은 ResizeObserver를, ResponsiveOverlay는 matchMedia를,
// 그 모바일 바텀시트(vaul)는 포인터 캡처를 쓴다(P4b-V 가입 오버레이). jsdom 환경(unit)에서만 채운다. matchMedia는 늘 모바일 폭
if (typeof window !== 'undefined') {
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.matchMedia ??= (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.hasPointerCapture ??= () => false;
}

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
// 공용 에러 토스트 감시(src/test/error-toast.ts)
beforeEach(resetErrorToast);
afterEach(() => {
  server.resetHandlers();
  // vitest 전역(globals)을 쓰지 않아 Testing Library가 자동 정리를 붙이지 못한다
  cleanup();
});
afterAll(() => server.close());
