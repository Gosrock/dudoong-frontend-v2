'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { deleteEventMutation } from '@/api/event/mutations';
import { MY_EVENTS_KEY } from '@/api/event/queries';
import type { EventStatus } from '@/api/event/schema';
import { handleError, settle } from '@/api/settle';
import type { ActorRole } from '@/features/shared/permission/model/can';

import { applyDeleted } from './event-cache';
import { canDeleteEvent } from './event-scope';

/** 화면이 처리하는 DE-9 코드 */
export const DELETE_EVENT_ERROR_MESSAGE = {
  /** 준비중이 아닌 공연(그사이 등록됨) — 목록을 다시 읽으면 ⋮ 삭제가 사라진다 */
  Event_400_19: '등록된 공연은 삭제할 수 없어요',
} as const;

/**
 * 공연 삭제(DE-9, plan P11) — 공연준비 홈 준비중 공연 카드의 ⋮(P10a 자리). 확인 팝업은 V.
 * 준비중 공연 + 매니저 이상만(`canDeleteEvent`) — 아니면 요청하지 않는다. 성공하면 GE-1·GH-1을 무효화하고 그 공연의 관리 캐시를 버린다.
 * `Event_400_19`(준비중 아님) → GE-1을 다시 읽고 `error`. 그 밖은 공용 토스트(handleError).
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    ...deleteEventMutation(),
    onSuccess: (_, eventId) => applyDeleted(queryClient, eventId),
  });

  /** 지웠으면 `true`. 지울 수 없는 공연·다른 삭제 중이면 요청하지 않고 `false` */
  const deleteEvent = useCallback(
    async (event: { eventId: number; status: EventStatus; myRole: ActorRole | null }) => {
      if (!canDeleteEvent(event) || mutation.isPending) return false;
      setError(null);
      const r = await settle(mutation.mutateAsync(event.eventId));
      if (r.ok) return true;
      handleError(r.error, {
        Event_400_19: () => {
          setError(DELETE_EVENT_ERROR_MESSAGE.Event_400_19);
          void queryClient.invalidateQueries({ queryKey: MY_EVENTS_KEY });
        },
      });
      return false;
    },
    [mutation, queryClient],
  );

  return {
    deleteEvent,
    /** 지우는 중인 공연 id */
    deletingId: mutation.isPending ? (mutation.variables ?? null) : null,
    error,
  };
}
