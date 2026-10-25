'use client';

import { type InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { newApprovedTicketsQuery } from '@/api/my-ticket/queries';
import { readNotificationsMutation } from '@/api/notification/mutations';
import {
  NOTIFICATIONS_INFINITE_KEY,
  unreadNotificationCountQuery,
} from '@/api/notification/queries';
import type { NotificationPage, UnreadCount } from '@/api/notification/schema';

import { isApprovalNotification, readRequestOf, type ReadTarget } from './notification-kind';

type InboxData = InfiniteData<NotificationPage>;

/** 이 요청이 안 읽음 → 읽음으로 바꾼 행(실패하면 이것만 되돌린다)과 그중 승인 알림이 있었는지 */
type ReadContext = { changedIds: number[]; approval: boolean };

function setRead(data: InboxData | undefined, ids: Set<number>, isRead: boolean) {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      content: page.content.map((n) => (ids.has(n.notificationId) ? { ...n, isRead } : n)),
    })),
  };
}

/**
 * PN-3 읽음(단건·전체). 알림함 행과 벨이 같이 쓴다(patterns §21).
 *
 * - 행의 읽음 표시는 **낙관적으로** 바꾸고, 실패하면 이 요청이 바꾼 행만 되돌린다(토스트는 전역)
 * - 벨(GN-2)은 응답 `unreadCount`로 바로 채운다 — 행 수로 차감을 추정하지 않는다(다른 페이지·다른 기기의 알림이 있다)
 * - 승인 알림(`ORDER_APPROVED`)을 읽었거나 전체 읽음이면 티켓탭 공지 바(G11/T-3)를 다시 읽는다 — 그 알림을 읽으면 풀린다
 * - 같은 `scope`로 묶어 하나씩 보낸다 — 나중 응답의 `unreadCount`가 언제나 더 최신이다
 * - 캐시 반영은 `useMutation` 옵션에 둔다 — 알림을 누르고 바로 다른 화면으로 가도(언마운트) 벨·공지 바가 갱신된다
 */
export function useReadNotifications() {
  const queryClient = useQueryClient();
  const bellKey = unreadNotificationCountQuery().queryKey;

  const { mutate, isPending } = useMutation({
    mutationKey: ['me', 'notifications', 'read'],
    scope: { id: 'notifications-read' },
    mutationFn: (target: ReadTarget, context) =>
      readNotificationsMutation().mutationFn!(readRequestOf(target), context),
    onMutate: async (target): Promise<ReadContext> => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_INFINITE_KEY });
      const changed = new Set<number>();
      let approval = false;
      for (const [, data] of queryClient.getQueriesData<InboxData>({
        queryKey: NOTIFICATIONS_INFINITE_KEY,
      })) {
        for (const n of data?.pages.flatMap((p) => p.content) ?? []) {
          if (n.isRead || (target !== 'all' && n.notificationId !== target)) continue;
          changed.add(n.notificationId);
          if (isApprovalNotification(n.type)) approval = true;
        }
      }
      if (changed.size > 0) {
        queryClient.setQueriesData<InboxData>({ queryKey: NOTIFICATIONS_INFINITE_KEY }, (d) =>
          setRead(d, changed, true),
        );
      }
      return { changedIds: [...changed], approval };
    },
    onError: (_e, _target, ctx) => {
      if (!ctx || ctx.changedIds.length === 0) return;
      const ids = new Set(ctx.changedIds);
      queryClient.setQueriesData<InboxData>({ queryKey: NOTIFICATIONS_INFINITE_KEY }, (d) =>
        setRead(d, ids, false),
      );
    },
    onSuccess: async (result, target, ctx) => {
      // 그 전에 떠난 GN-2가 늦게 와서 덮지 않게
      await queryClient.cancelQueries({ queryKey: bellKey, exact: true });
      queryClient.setQueryData<UnreadCount>(bellKey, { count: result.unreadCount });
      if (target === 'all' || ctx?.approval) {
        void queryClient.invalidateQueries({
          queryKey: newApprovedTicketsQuery().queryKey,
          exact: true,
        });
      }
    },
  });

  /** 한 건 읽음 — 목록에서 누른 알림 */
  const read = useCallback((id: number) => mutate(id), [mutate]);
  /** 모두 읽음 */
  const readAll = useCallback(() => mutate('all'), [mutate]);

  return { read, readAll, isPending };
}
