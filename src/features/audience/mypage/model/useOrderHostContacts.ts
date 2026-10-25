'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { eventDetailViewerQuery } from '@/api/event/queries';
import { useSession } from '@/features/shared/auth/useSession';
import {
  type ContactsState,
  resolveContacts,
} from '@/features/shared/contact/model/viewer-contacts';

const NO_PUBLIC_CONTACTS: never[] = [];

/**
 * 주문상세의 호스트 문의(plan P9, patterns §20). 주문상세에는 연락처가 없어 GP-3을 다시 읽는다 — **viewer만 읽는다**:
 * 쿠키를 싣는 `eventDetailViewerQuery`(`['events', id, 'viewer']`)를 `open`(문의 시트가 열렸는지 — 시트는 V가 연다)이고 세션이
 * 있을 때 한 번. 공개 GP-3(`eventDetailQuery`)은 부르지 않는다.
 *
 * 공연 상세의 `useEventContacts`를 쓰지 않는 이유: 그 훅은 서버 프리페치를 전제로 공개 GP-3을 `useSuspenseQuery`로 늘 읽는다.
 * 주문상세에는 프리페치가 없어 그대로 쓰면 화면 전체가 서스펜드되고, 시트를 열기 전에 공개 GP-3(가린 값 — 쓸 데가 없다)을 부른다.
 * 주문상세는 보호 화면이라 게이트가 세션을 확정한 뒤에만 그려지므로 공개 값으로 먼저 그릴 일도 없다 → 요청은 시트를 열 때 1회.
 * 상태 판정은 공연 상세·호스트 홈과 같은 `resolveContacts`(공개 값 자리는 빈 목록).
 *
 * `eventId`가 null(삭제된 공연)이면 요청하지 않고 `available: false`(문의 입구 없음).
 */
export function useOrderHostContacts(
  eventId: number | null,
  { open }: { open: boolean },
): ContactsState & { available: boolean; retry: () => void } {
  const session = useSession();
  const viewer = useQuery({
    ...eventDetailViewerQuery(eventId ?? 0),
    enabled: eventId !== null && open && session.status === 'session',
    select: (d) => d.contacts,
  });

  const state = useMemo(
    () =>
      resolveContacts({
        publicContacts: NO_PUBLIC_CONTACTS,
        session: session.status,
        requested: open,
        viewer: { contacts: viewer.data, isError: viewer.isError },
      }),
    [session.status, open, viewer.data, viewer.isError],
  );

  return {
    ...state,
    available: eventId !== null,
    retry: () => {
      if (session.status === 'error') session.retry();
      else void viewer.refetch();
    },
  };
}
