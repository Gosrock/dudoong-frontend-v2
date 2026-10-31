'use client';

import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { eventDetailQuery, eventDetailViewerQuery } from '@/api/event/queries';
import { useSession } from '@/features/shared/auth/useSession';
import {
  type ContactsState,
  resolveContacts,
} from '@/features/shared/contact/model/viewer-contacts';

/**
 * 공연 상세의 문의처(GP-3 `contacts` — 공연 문의처, 없으면 호스트 연락처). 연락처는 사용자별 값이다(백엔드 #822/#846):
 * 서버 조회(쿠키 없음) 값은 전화·이메일이 가려져 있다.
 *
 * - 익명이 확정되면 요청하지 않고 공개 값(가린 값)을 쓴다.
 * - 로그인 사용자는 `open`(연락처 시트가 열렸는지 — 시트는 V가 연다)이 true가 될 때 GP-3을 쿠키와 함께 한 번 더 읽어
 *   (`eventDetailViewerQuery`, 공개 키와 다른 키) 그 `contacts`를 쓴다. 닫혀 있는 동안에는 추가 요청이 없다.
 *   한 번 읽은 원문은 닫아도 그대로 `ready`이고, 다시 열면 뒤에서 새로 읽는다(viewer `staleTime` 0).
 *
 * 돌려주는 값: `status`·`items`·`masked`(`resolveContacts`), `retry`(세션 확인 또는 viewer 조회 다시).
 */
export function useEventContacts(
  eventId: string,
  { open }: { open: boolean },
): ContactsState & { retry: () => void } {
  const { data: event } = useSuspenseQuery(eventDetailQuery(eventId));
  const session = useSession();
  const viewer = useQuery({
    ...eventDetailViewerQuery(eventId),
    enabled: open && session.status === 'session',
    select: (d) => d.contacts,
  });

  const state = useMemo(
    () =>
      resolveContacts({
        publicContacts: event.contacts,
        session: session.status,
        requested: open,
        viewer: { contacts: viewer.data, isError: viewer.isError },
      }),
    [event.contacts, session.status, open, viewer.data, viewer.isError],
  );

  return {
    ...state,
    retry: () => {
      if (session.status === 'error') session.retry();
      else void viewer.refetch();
    },
  };
}
