import { vi } from 'vitest';

/**
 * 테스트 세계의 "오늘"(KST 2026-11-18 정오). `vitest.setup.ts`보다 먼저 도는 setup 파일이다 — setup이 import하는 MSW 핸들러가
 * 픽스처를 읽는데, 픽스처 공연 101 시작은 "지금 + 3일"(`kstDaysFromNow`)이라 읽는 순간의 시각을 쓴다(2026-11-22).
 * 테스트마다 다시 거는 것은 `vitest.setup.ts`의 beforeEach.
 */
export const TEST_NOW = new Date('2026-11-18T12:00:00+09:00');

vi.useFakeTimers({ now: TEST_NOW, toFake: ['Date'], shouldAdvanceTime: true });
