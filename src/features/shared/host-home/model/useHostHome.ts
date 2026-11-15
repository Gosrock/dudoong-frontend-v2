'use client';

import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { hostDetailQuery, hostMembersQuery } from '@/api/host/queries';
import {
  type ContactsState,
  resolveContacts,
} from '@/features/shared/contact/model/viewer-contacts';

import { type HostManageAction, hostManageActions } from './host-home-rules';
import { useHostEvents, useHostViewer } from './useHostEvents';
import { useHostFollow } from './useHostFollow';

export type { HostEventCard, HostEventsMode } from './useHostEvents';

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
  const viewerState = useHostViewer(hostId);
  const { session, query: viewerQuery, status: viewerStatus, viewer, myRole } = viewerState;

  const follow = useHostFollow(hostId, viewerStatus, viewer);

  const manage: { status: 'pending' } | { status: 'ready'; actions: HostManageAction[] } =
    viewerStatus === 'pending' || viewerStatus === 'error'
      ? { status: 'pending' }
      : { status: 'ready', actions: hostManageActions(hostId, myRole) };

  const membersQuery = useQuery({ ...hostMembersQuery(hostId), enabled: myRole !== null });

  const events = useHostEvents(hostId, viewerState);

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

  return {
    host,
    memberCount: host.memberCount,
    createdOn,
    contacts,
    viewerStatus,
    /** 세션·viewer 확인 실패 때 다시 시도 */
    retryViewer: viewerState.retry,
    myRole,
    follow,
    manage,
    members: membersQuery.data ?? null,
    events,
  };
}
