import type { QueryClient } from '@tanstack/react-query';

import { clearSessionFlag } from '@/api/session-flag';

import { browserLocation } from './browser-location';
import { expiredHref } from './login-href';
import { isInProtectedArea } from './protected-area';

/**
 * 세션 상실(`onSessionLost`, tech-decisions §4 인증 표). `src/api`가 한 번만 부른다.
 * 캐시 비우기 → `dd:session` 제거 → 보호 영역이면 `/login/expired?redirect=…`, 그 밖이면 같은 주소를 익명으로 다시 그린다.
 * 토스트·에러 화면은 없다(`SessionLostError`는 전역 onError·AsyncBoundary·게이트가 거른다).
 */
export function handleSessionLost(queryClient: QueryClient) {
  const here = browserLocation.currentPath();
  queryClient.clear();
  clearSessionFlag();
  if (isInProtectedArea()) browserLocation.assign(expiredHref(here));
  else browserLocation.reload();
}
