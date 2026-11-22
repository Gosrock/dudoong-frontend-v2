import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

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

/**
 * 테스트 세계의 "오늘"(KST 2026-11-18 정오) — 가짜 백엔드 픽스처(`src/api/__mocks__/fixtures`)의 공연 · 판매 시각이 2026-11 기준
 * 절대값이라, 실제 날짜가 지나면 결과가 바뀐다(2026-11-22: 공연 101 시작 11-21이 지나 E-11 취소가 `Event_400_29`, 공연준비 홈 목록에서
 * 빠짐). `Date`만 가짜로 이 시각에서 시작해 실제 속도로 흐른다(`shouldAdvanceTime` — 시각 차이를 보는 테스트가 있다), 타이머는 진짜.
 * 테스트마다 다시 걸고 끝나면 푼다. 자기 시각 · 가짜 타이머가 필요한 테스트는 그 안에서 `vi.useFakeTimers`를 다시 부르거나 규칙 함수에 `now`를 넘긴다
 */
export const TEST_NOW = new Date('2026-11-18T12:00:00+09:00');
beforeEach(() => {
  vi.useFakeTimers({ now: TEST_NOW, toFake: ['Date'], shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
// 공용 에러 토스트 감시(src/test/error-toast.ts)
beforeEach(resetErrorToast);
afterEach(() => {
  server.resetHandlers();
  // vitest 전역(globals)을 쓰지 않아 Testing Library가 자동 정리를 붙이지 못한다
  cleanup();
});
afterAll(() => server.close());
