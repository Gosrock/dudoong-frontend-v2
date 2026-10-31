'use client';

import { useInfiniteQuery, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  hostDetailQuery,
  hostEventsQuery,
  hostEventsViewerQuery,
  hostMembersQuery,
  hostViewerQuery,
} from '@/api/host/queries';
import type { HostEvent } from '@/api/host/schema';
import { flattenPages } from '@/api/shared/page';
import { useSession } from '@/features/shared/auth/useSession';
import {
  type ContactsState,
  resolveContacts,
} from '@/features/shared/contact/model/viewer-contacts';

import { hostEventHref, type HostManageAction, hostManageActions } from './host-home-rules';
import { useHostFollow, type ViewerStatus } from './useHostFollow';

export type HostEventCard = { event: HostEvent; href: string; isPreparing: boolean };

/**
 * 공연 목록을 어느 키로 읽는지. 세션·viewer가 확정되기 전에는 읽지 않는다 — 공개 목록을 그렸다가 멤버 목록으로
 * 바꾸지 않게 한 번만 읽는다(patterns §4-2). viewer·세션 확인이 실패하면 공개 목록(안전한 쪽)으로 읽는다.
 */
export type HostEventsMode = 'waiting' | 'public' | 'member';

/**
 * 호스트 홈 화면 상태(UI 무관, plan P5c). 라우트가 `<Prefetch>`로 GH-3 공개 값을 넘겨 주므로 `useSuspenseQuery`로 읽고,
 * 사용자별 값(`myRole`·`isFollowing`)은 세션이 있을 때만 viewer 키로 브라우저에서 읽는다(tech-decisions §4).
 *
 * 돌려주는 값
 * - 공개: `host`(소개·이미지), `memberCount`, `createdOn`(개설일 yyyy.MM.dd)
 * - `contacts` — 연락처 상태(`resolveContacts`). 연락처는 사용자별 값이다(백엔드 #822/#846 — 비로그인이면 전화·이메일을 가린다).
 *   익명은 공개 값(가린 값), 로그인은 이미 읽는 viewer(GH-3 쿠키) 응답의 원문을 쓴다 — 추가 요청 없음.
 *   viewer 확정 전·실패 동안 `items`는 공개 값이고 `status`가 `pending`·`error`다. `host.contacts`(공개 값)를 직접 그리지 않는다
 * - `viewerStatus`, `myRole`(확정 전·익명·비멤버는 null)
 * - `follow` — ♡(`useHostFollow`)
 * - `manage` — 관리 버튼. 확정 전에는 `pending`(비활성 자리), 확정되면 `can`으로 거른 목록(비멤버는 빈 배열)
 * - `members` — GH-6. `myRole`이 있을 때만 읽는다(아바타 줄)
 * - `events` — GH-14 무한 목록(비멤버 공개 키 / 멤버 viewer 키), 카드마다 이동 주소
 */
export function useHostHome(hostId: string) {
  const { data: host } = useSuspenseQuery(hostDetailQuery(hostId));
  const session = useSession();

  const viewerQuery = useQuery({
    ...hostViewerQuery(hostId),
    enabled: session.status === 'session',
  });
  const viewerStatus: ViewerStatus =
    session.status === 'anonymous'
      ? 'anonymous'
      : session.status === 'error'
        ? 'error'
        : session.status === 'pending'
          ? 'pending'
          : viewerQuery.data
            ? 'ready'
            : viewerQuery.isError
              ? 'error'
              : 'pending';
  const viewer = viewerStatus === 'ready' ? viewerQuery.data : undefined;
  const myRole = viewer?.myRole ?? null;

  const follow = useHostFollow(hostId, viewerStatus, viewer);

  const manage: { status: 'pending' } | { status: 'ready'; actions: HostManageAction[] } =
    viewerStatus === 'pending' || viewerStatus === 'error'
      ? { status: 'pending' }
      : { status: 'ready', actions: hostManageActions(hostId, myRole) };

  const membersQuery = useQuery({ ...hostMembersQuery(hostId), enabled: myRole !== null });

  const eventsMode: HostEventsMode =
    viewerStatus === 'pending' ? 'waiting' : myRole !== null ? 'member' : 'public';
  const publicEvents = useInfiniteQuery({
    ...hostEventsQuery(hostId),
    enabled: eventsMode === 'public',
  });
  const memberEvents = useInfiniteQuery({
    ...hostEventsViewerQuery(hostId),
    enabled: eventsMode === 'member',
  });
  const list = eventsMode === 'member' ? memberEvents : publicEvents;

  const events = useMemo<HostEventCard[]>(
    () =>
      flattenPages(list.data, (e) => e.eventId).map((event) => ({
        event,
        href: hostEventHref(event),
        isPreparing: event.status === 'PREPARING',
      })),
    [list.data],
  );

  const createdOn = host.createdAt?.slice(0, 10) ?? null;

  const contacts = useMemo<ContactsState>(
    () =>
      resolveContacts({
        publicContacts: host.contacts,
        session: session.status,
        // 세션이 있으면 viewer는 ♡ 때문에 이미 부른다 — 연락처를 위해 따로 부르지 않는다
        requested: true,
        viewer: { contacts: viewerQuery.data?.contacts, isError: viewerQuery.isError },
      }),
    [host.contacts, session.status, viewerQuery.data?.contacts, viewerQuery.isError],
  );

  const eventsStatus =
    eventsMode === 'waiting' || list.isPending
      ? 'pending'
      : list.isError && !list.data
        ? 'error'
        : events.length === 0
          ? 'empty'
          : 'success';

  return {
    host,
    memberCount: host.memberCount,
    createdOn,
    contacts,
    viewerStatus,
    /** 세션·viewer 확인 실패 때 다시 시도 */
    retryViewer: () => {
      if (session.status === 'error') session.retry();
      else void viewerQuery.refetch();
    },
    myRole,
    follow,
    manage,
    members: membersQuery.data ?? null,
    events: {
      mode: eventsMode,
      status: eventsStatus,
      items: events,
      hasNextPage: list.hasNextPage,
      isFetchingNextPage: list.isFetchingNextPage,
      /** 다음 페이지 실패 — 기존 행은 두고 하단 재시도(patterns §12) */
      nextPageError: list.isFetchNextPageError,
      loadMore: () => {
        // 읽는 중에 다시 불려도 진행 중인 요청을 취소·재요청하지 않는다
        if (list.hasNextPage && !list.isFetching) void list.fetchNextPage({ cancelRefetch: false });
      },
      retry: () => void (list.isFetchNextPageError ? list.fetchNextPage() : list.refetch()),
    },
  };
}
