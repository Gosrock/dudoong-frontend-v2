'use client';

import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { notificationsQuery } from '@/api/notification/queries';
import { flattenPages, type PageParams } from '@/api/shared/page';

import {
  NOTIFICATION_TABS,
  type NotificationTab,
  notificationTabSearch,
  type NotificationView,
  parseNotificationTab,
  toNotificationView,
} from './notification-kind';
import { useReadNotifications } from './useReadNotifications';

/** 창을 주소에 남긴다 — 서버를 다시 부르지 않는 얕은 교체(첫 인자 `null`, patterns §13). 알림을 누르고 돌아와도 그 창 */
function replaceTab(tab: NotificationTab) {
  const { pathname, search, hash } = window.location;
  const next = notificationTabSearch(tab, search);
  if (next === search) return;
  window.history.replaceState(null, '', `${pathname}${next}${hash}`);
}

/** 한 줄 + 이번 방문에서 "새 알림"으로 보일지 */
export type InboxItem = NotificationView & {
  /** 창을 열 때 안 읽음이었던 알림 — 읽음 처리를 보낸 뒤에도 이번 방문 동안은 진하게 둔다 */
  isNew: boolean;
};

/**
 * 알림함(`/mypage/notifications`, plan P9b · GUI #375 · #376). 보호 화면이라 `<AsyncBoundary>` 안에서 GN-1을 무한 쿼리로 읽는다.
 * 관객과 호스팅 센터가 같은 알림함을 쓴다.
 *
 * - **창(관객 / 호스트)**: GN-1에 창 파라미터가 없어 받은 행을 `type`으로 나눈다(`notificationTab`). 주소 `?tab=host`(관객은 기본).
 *   한 창의 행이 적어도 아래 끝(`LoadMoreSentinel`)이 보이면 다음 페이지를 이어 읽는다. 빈 창은 다음 페이지가 없을 때만 `empty`
 * - **창을 열면 새 알림 읽음**(#375): 지금 창의 불러온 안 읽은 행을 PN-3 `notificationIds`로 보낸다(전체 읽음 `readAll`은 다른 창까지
 *   읽어 버려 쓰지 않는다). 다음 페이지에서 온 안 읽은 행도 보이는 대로. 보낸 행은 이번 방문 동안 `isNew`로 진하게 둔다
 * - **다른 창 빨간 점**: 불러온 행 중 그 창에 안 읽은 것이 있으면(`tabs[].hasUnread`). 아직 안 불러온 페이지는 모른다
 * - **정렬**: 서버 최신순 하나(GN-1에 정렬 없음 — B75). `sortLabel` 고정
 * - 다음 페이지 실패는 기존 행을 지우지 않고 `nextPageFailed` + `fetchNext()`로 다시(전역 토스트 없음)
 * - `open(id)` — 알림을 누를 때. 안 읽은 알림만 PN-3 단건(이동은 V가 `href`로)
 */
export function useNotificationInbox(params: PageParams = {}) {
  const q = useSuspenseInfiniteQuery(notificationsQuery(params));
  const { read, readSeen } = useReadNotifications();
  const tab = parseNotificationTab(useSearchParams());

  const all: NotificationView[] = useMemo(
    () => flattenPages(q.data, (n) => n.notificationId).map(toNotificationView),
    [q.data],
  );
  const inTab = useMemo(() => all.filter((i) => i.tab === tab), [all, tab]);
  const unreadInTab = useMemo(() => inTab.filter((i) => !i.isRead).map((i) => i.id), [inTab]);

  // 창을 열 때 안 읽음이었던 행(이번 방문 동안 진하게). 렌더 중에 더한다 — 읽음 처리(낙관 갱신)보다 먼저 잡아야 한다
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set());
  if (unreadInTab.some((id) => !seen.has(id))) {
    setSeen(new Set([...seen, ...unreadInTab]));
  }

  // 같은 알림을 두 번 보내지 않는다(실패해 되돌아간 행도 이번 방문에서는 다시 보내지 않는다)
  const sent = useRef(new Set<number>());
  useEffect(() => {
    const ids = unreadInTab.filter((id) => !sent.current.has(id));
    if (ids.length === 0) return;
    for (const id of ids) sent.current.add(id);
    readSeen(ids);
  }, [unreadInTab, readSeen]);

  const items: InboxItem[] = useMemo(
    () => inTab.map((i) => ({ ...i, isNew: !i.isRead || seen.has(i.id) })),
    [inTab, seen],
  );

  const tabs = useMemo(
    () =>
      NOTIFICATION_TABS.map((t) => ({
        ...t,
        hasUnread: t.key !== tab && all.some((i) => i.tab === t.key && !i.isRead),
      })),
    [all, tab],
  );

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = q;
  const fetchNext = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const open = useCallback(
    (id: number) => {
      const item = all.find((i) => i.id === id);
      if (item && !item.isRead) read(id);
    },
    [all, read],
  );

  return {
    tab,
    tabs,
    setTab: replaceTab,
    /** 서버 정렬 하나(B75) — 고정 라벨 */
    sortLabel: '최신순' as const,
    items,
    /** 이 창에 보일 행이 없고 더 읽을 페이지도 없다 */
    empty: items.length === 0 && !hasNextPage,
    hasNext: hasNextPage,
    isFetchingNext: isFetchingNextPage,
    nextPageFailed: q.isFetchNextPageError,
    fetchNext,
    open,
  };
}
