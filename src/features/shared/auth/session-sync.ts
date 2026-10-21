import type { QueryClient } from '@tanstack/react-query';

import { meQuery } from '@/api/me/queries';
import {
  adoptSessionFlag,
  knownSessionFlag,
  readSessionFlag,
  SESSION_KEY,
} from '@/api/session-flag';

import { browserLocation } from './browser-location';
import { loginHref } from './login-href';
import { isInProtectedArea } from './protected-area';

/**
 * 다른 탭의 로그아웃·계정 전환(tech-decisions §4 인증 표). `dd:session`이 **사라지거나 다른 값으로 바뀌면**
 * 캐시를 비우고 보호 영역이면 `/login?redirect=…`, 그 밖이면 새로고침한다. 공개 화면은 쿠키 없이 부르고 세션 쿼리도
 * 5분 동안 다시 부르지 않으므로, 이게 없으면 다른 탭에 이전 사용자 화면이 남는다.
 *
 * 없던 값이 생긴 경우(다른 탭에서 로그인했거나 GM-1이 표시를 세움): 이 탭도 이미 세션을 갖고 있으면 값만 받아들이고,
 * 익명으로 그려져 있으면 새로고침해 로그인 상태로 다시 그린다.
 */
export function handleSessionStorageEvent(event: StorageEvent, queryClient: QueryClient) {
  // key가 null이면 localStorage.clear()
  if (event.key !== null && event.key !== SESSION_KEY) return;
  if (event.storageArea && event.storageArea !== safeLocalStorage()) return;
  const next = event.key === null ? null : event.newValue;
  const known = knownSessionFlag();
  if (next === known) return;

  if (known === null && next !== null) {
    if (queryClient.getQueryData(meQuery().queryKey)) {
      adoptSessionFlag(next);
      return;
    }
    queryClient.clear();
    browserLocation.reload();
    return;
  }

  queryClient.clear();
  if (isInProtectedArea()) browserLocation.assign(loginHref(browserLocation.currentPath()));
  else browserLocation.reload();
}

/**
 * 뒤로가기 캐시(bfcache) 복원. 값이 로드 때(이 탭이 마지막으로 안 값)와 다르면 새로고침한다.
 * 불린이 아니라 값으로 비교해 "A 로그아웃 → B 로그인 → 뒤로가기로 A 화면 복원"도 잡는다.
 */
export function handlePageShow(event: PageTransitionEvent) {
  if (!event.persisted) return;
  if (readSessionFlag() !== knownSessionFlag()) browserLocation.reload();
}

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
