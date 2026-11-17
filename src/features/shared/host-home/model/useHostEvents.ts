'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { isEventCanceled } from '@/api/event/schema';
import { hostEventsQuery, hostEventsViewerQuery, hostViewerQuery } from '@/api/host/queries';
import type { HostEvent } from '@/api/host/schema';
import { flattenPages, infiniteListControls } from '@/api/shared/page';
import { useSession } from '@/features/shared/auth/model/useSession';

import { hostEventHref } from './host-home-rules';
import type { ViewerStatus } from './useHostFollow';

/** `isCanceled` — 호스트가 취소한 공연(H-14 `canceledAt`, Api 2.5.15 — 상태는 OPEN 그대로라 이 값으로 판정) */
export type HostEventCard = {
  event: HostEvent;
  href: string;
  isPreparing: boolean;
  isCanceled: boolean;
};

/**
 * 공연 목록을 어느 키로 읽는지. 세션·viewer가 확정되기 전에는 읽지 않는다 — 공개 목록을 그렸다가 멤버 목록으로
 * 바꾸지 않게 한 번만 읽는다(patterns §4-2). viewer·세션 확인이 실패하면 공개 목록(안전한 쪽)으로 읽는다.
 */
export type HostEventsMode = 'waiting' | 'public' | 'member';

/**
 * 사용자별 호스트 값(GH-3 viewer — `myRole`·`isFollowing`·원문 연락처). 세션이 있을 때만 브라우저에서 읽는다(tech-decisions §4).
 * 호스트 홈과 공연 리스트(`/hosts/[hostId]/events`)가 같이 쓴다.
 */
export function useHostViewer(hostId: string) {
  const session = useSession();
  const query = useQuery({ ...hostViewerQuery(hostId), enabled: session.status === 'session' });
  const status: ViewerStatus =
    session.status === 'anonymous'
      ? 'anonymous'
      : session.status === 'error'
        ? 'error'
        : session.status === 'pending'
          ? 'pending'
          : query.data
            ? 'ready'
            : query.isError
              ? 'error'
              : 'pending';
  const viewer = status === 'ready' ? query.data : undefined;
  return {
    session,
    query,
    status,
    viewer,
    myRole: viewer?.myRole ?? null,
    /** 세션·viewer 확인 실패 때 다시 시도 */
    retry: () => {
      if (session.status === 'error') session.retry();
      else void query.refetch();
    },
  };
}

/**
 * 호스트 공연 목록(GH-14 무한 목록, 브라우저에서만 — patterns §4-2). 비멤버는 공개 키, 멤버는 viewer 키(준비중 포함).
 * 카드마다 이동 주소(`hostEventHref`). 호스트 홈 가로 줄과 공연 리스트 2열이 같이 쓴다(같은 캐시).
 */
export function useHostEvents(
  hostId: string,
  viewer: Pick<ReturnType<typeof useHostViewer>, 'status' | 'myRole'>,
) {
  const mode: HostEventsMode =
    viewer.status === 'pending' ? 'waiting' : viewer.myRole !== null ? 'member' : 'public';
  const publicEvents = useInfiniteQuery({ ...hostEventsQuery(hostId), enabled: mode === 'public' });
  const memberEvents = useInfiniteQuery({
    ...hostEventsViewerQuery(hostId),
    enabled: mode === 'member',
  });
  const list = mode === 'member' ? memberEvents : publicEvents;

  const items = useMemo<HostEventCard[]>(
    () =>
      flattenPages(list.data, (e) => e.eventId).map((event) => ({
        event,
        href: hostEventHref(event),
        isPreparing: event.status === 'PREPARING',
        isCanceled: isEventCanceled(event),
      })),
    [list.data],
  );

  const status =
    mode === 'waiting' || list.isPending
      ? 'pending'
      : list.isError && !list.data
        ? 'error'
        : items.length === 0
          ? 'empty'
          : 'success';

  return {
    mode,
    status,
    items,
    /** 다음 페이지 실패(`nextPageError`) — 기존 행은 두고 하단 재시도(patterns §12) */
    ...infiniteListControls(list),
  } as const;
}

export type HostEvents = ReturnType<typeof useHostEvents>;
