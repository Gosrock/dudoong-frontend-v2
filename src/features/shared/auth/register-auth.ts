import type { QueryClient } from '@tanstack/react-query';

import { refreshTokens } from '@/api/auth/calls';
import { setAuthHandlers } from '@/api/auth-handlers';
import { knownSessionFlag } from '@/api/session-flag';

import { handleSessionLost } from './session-lost';
import { handlePageShow, handleSessionStorageEvent } from './session-sync';

/**
 * 인증 처리를 붙인다(루트 providers.tsx의 effect에서 한 번). 돌려준 함수로 뗀다.
 * - `src/api`의 401 처리에 재발급 호출과 세션 상실 처리를 넣는다(`setAuthHandlers`)
 * - `storage`(다른 탭 로그아웃·계정 전환)·`pageshow`(bfcache 복원)를 듣는다
 */
export function registerAuth(queryClient: QueryClient) {
  // 로드 때 값을 기억한다 — storage·pageshow가 이것과 비교한다
  knownSessionFlag();
  setAuthHandlers({
    refresh: refreshTokens,
    onSessionLost: () => handleSessionLost(queryClient),
  });
  const onStorage = (e: StorageEvent) => handleSessionStorageEvent(e, queryClient);
  window.addEventListener('storage', onStorage);
  window.addEventListener('pageshow', handlePageShow);
  return () => {
    setAuthHandlers(null);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('pageshow', handlePageShow);
  };
}
