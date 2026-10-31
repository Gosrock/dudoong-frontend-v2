'use client';

import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { notificationsQuery } from '@/api/notification/queries';
import { flattenPages, type PageParams } from '@/api/shared/page';

import { type NotificationView, toNotificationView } from './notification-kind';
import { useReadNotifications } from './useReadNotifications';

/**
 * 알림함(`/mypage/notifications`, plan P9b). 보호 화면이라 `<AsyncBoundary>` 안에서 GN-1을 무한 쿼리로 읽는다.
 * 관객과 호스팅 센터가 같은 알림함을 쓴다.
 *
 * - 목록은 id로 중복을 지운 뒤 행 값(`NotificationView` — 카테고리·아이콘·이동 경로, 문구는 서버 값)으로 바꾼다
 * - 건수(`totalElements`)는 Slice라 null — 건수를 쓰지 않는다. 다음 페이지는 `hasNext`
 * - 다음 페이지 실패는 기존 행을 지우지 않고 `nextPageFailed` + `fetchNext()`로 다시(전역 토스트 없음)
 * - `open(id)` — 알림을 누를 때. 안 읽은 알림만 PN-3을 보낸다(이동은 V가 `href`로). `readAll()` — 모두 읽음
 */
export function useNotificationInbox(params: PageParams = {}) {
  const q = useSuspenseInfiniteQuery(notificationsQuery(params));
  const { read, readAll, isPending } = useReadNotifications();

  const items: NotificationView[] = useMemo(
    () => flattenPages(q.data, (n) => n.notificationId).map(toNotificationView),
    [q.data],
  );

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = q;
  const fetchNext = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const open = useCallback(
    (id: number) => {
      const item = items.find((i) => i.id === id);
      if (item && !item.isRead) read(id);
    },
    [items, read],
  );

  return {
    items,
    empty: items.length === 0,
    /** 불러온 행 중에 안 읽은 것이 있는지([모두 읽음] 활성 판단의 보조 — 벨이 더 정확하다) */
    hasUnread: items.some((i) => !i.isRead),
    hasNext: hasNextPage,
    isFetchingNext: isFetchingNextPage,
    nextPageFailed: q.isFetchNextPageError,
    fetchNext,
    open,
    readAll,
    isReading: isPending,
  };
}
