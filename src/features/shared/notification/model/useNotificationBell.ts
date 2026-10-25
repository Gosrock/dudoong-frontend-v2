'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { unreadNotificationCountQuery } from '@/api/notification/queries';
import { useSession } from '@/features/shared/auth/useSession';

/**
 * 알림 벨(GN-2, patterns §21). 관객 헤더·호스팅 셸이 같이 쓴다(S7 — P9b가 먼저 만들었다).
 *
 * - 세션이 있을 때만 부른다(`visible`). 익명·세션 확인 중에는 요청하지 않는다
 * - `hasUnread` = `count > 0`(빨간 점. 숫자는 그리지 않는다). 확정 전·실패면 false
 * - 창 포커스로 다시 읽는다(`staleTime` 0). 메뉴·드로어를 열 때는 `refresh()`
 * - 읽음(PN-3) 뒤에는 응답 `unreadCount`가 이 캐시를 바로 채운다(`useReadNotifications`)
 */
export function useNotificationBell() {
  const session = useSession();
  const loggedIn = session.status === 'session';
  const q = useQuery({
    ...unreadNotificationCountQuery(),
    enabled: loggedIn,
    refetchOnWindowFocus: true,
  });
  const { refetch } = q;
  const refresh = useCallback(() => {
    if (loggedIn) void refetch();
  }, [loggedIn, refetch]);

  return {
    /** 벨을 그릴지(로그인 확정) */
    visible: loggedIn,
    /** 빨간 점 */
    hasUnread: loggedIn && (q.data?.count ?? 0) > 0,
    refresh,
  };
}
