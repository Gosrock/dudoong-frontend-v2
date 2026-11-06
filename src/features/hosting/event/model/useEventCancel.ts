'use client';

import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { getErrorStatus, isForbidden, isNotFound } from '@/api/errors';
import { cancelEventMutation } from '@/api/event/mutations';
import { eventManageQuery, MY_EVENTS_KEY } from '@/api/event/queries';
import { type EventCancelResult, type EventManage, isEventCanceled } from '@/api/event/schema';
import { handleError } from '@/api/handle-error';
import { MY_TICKETS_KEY } from '@/api/my-ticket/queries';
import { useEventScope } from '@/features/hosting/shared/model/useEventScope';
import { can } from '@/features/shared/permission/model/can';

import {
  canCancelEvent,
  CANCEL_EVENT_ERROR_MESSAGE,
  CANCEL_EVENT_FORBIDDEN_MESSAGE,
  CANCEL_EVENT_UNCERTAIN_MESSAGE,
  CANCEL_EVENT_UNSUPPORTED_MESSAGE,
  type CancelEventErrorCode,
  cancelReasonError,
  cancelResultSummary,
} from './event-cancel';

/**
 * E-11 뒤 캐시(patterns §9). 공연 하나의 거의 모든 값이 바뀐다 — 관리(GE-3 · 대시보드 · 주문 · 환불 · 발급 티켓 · 티켓 재고)와 공개
 * 상세(GP-3 · GP-5)가 모두 `['events', id]` 아래라 접두로 한 번에, 그리고 목록(GE-1 공연준비 홈 · GP-1 홈 · GP-2 목록 — 취소 공연이
 * 빠진다)과 호스트 본인이 예매자일 수 있는 내 주문 · 내 티켓. 응답의 `canceledAt`·`cancelReason`은 GE-3에 먼저 넣어 화면이 바로 바뀐다
 */
async function applyEventCanceled(qc: QueryClient, eventId: string, result: EventCancelResult) {
  qc.setQueryData<EventManage>(eventManageQuery(eventId).queryKey, (prev) =>
    prev
      ? {
          ...prev,
          canceledAt: result.canceledAt ?? prev.canceledAt ?? null,
          cancelReason: result.cancelReason ?? prev.cancelReason ?? null,
        }
      : prev,
  );
  await Promise.all(
    [
      ['events', eventId],
      ['events', 'infinite'],
      ['home'],
      MY_EVENTS_KEY,
      ['me', 'orders'],
      MY_TICKETS_KEY,
    ].map((queryKey) => qc.invalidateQueries({ queryKey })),
  );
}

/**
 * 공연 취소(E-11, plan 이슈 #136 §7) — 공연 대시보드(등록 후) 아래 "공연 취소" 자리. 값 · 상태 · 동작만 돌려준다(오버레이 · 토스트는 V).
 *
 * - [공연 취소]: 마스터 + OPEN + 시작 전 + 아직 취소 안 됨(`canCancelEvent`). 사유는 간단한 폼(`useState` + 순수 함수, patterns §23)
 * - 결과(`result`): 이번 호출의 거절 · 취소 수와 남은 주문. `remaining > 0 || failed > 0`이면 [남은 주문 다시 처리](같은 API — 멱등)
 * - 취소된 공연에서 마스터는 [남은 주문 다시 처리]를 늘 볼 수 있다 — 새로고침하면 남은 수를 알 길이 없다(GE-3에 없음, 🤖 판단).
 *   이 화면에서 처리한 결과가 "남은 주문 없음"이면 숨긴다
 * - 에러(patterns §4-5 · §11): 403(마스터 아님) → GE-3 다시 읽기 + 안내, `Event_400_28`·`_29` → GE-3 다시 읽기 + 안내,
 *   `Event_400_31` → 사유 칸 오류, 404(운영 2.5.3 — API 없음) → 안내, 응답 없음(TIMEOUT · NETWORK) → 처리됐을 수 있어 GE-3을 다시 읽고
 *   [다시 처리] 안내. 그 밖은 공용 토스트
 *
 * 동작은 모두 `Promise<boolean>`(확인 창 계약 — 실패면 열린 채, patterns §6).
 */
export function useEventCancel(eventId: string) {
  const queryClient = useQueryClient();
  const scope = useEventScope(eventId);
  const { event, role } = scope;
  const canceled = isEventCanceled(event);
  const isMaster = can(role, 'cancelEvent');

  const [reason, setReasonState] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EventCancelResult | null>(null);
  const [uncertain, setUncertain] = useState(false);

  const mutation = useMutation({
    ...cancelEventMutation(eventId),
    onSuccess: (r) => applyEventCanceled(queryClient, eventId, r),
  });

  const refetchEvent = useCallback(
    () =>
      void queryClient.invalidateQueries({
        queryKey: eventManageQuery(eventId).queryKey,
        exact: true,
      }),
    [eventId, queryClient],
  );

  const setReason = useCallback((value: string) => {
    setReasonState(value);
    setReasonError(null);
  }, []);

  const run = useCallback(
    async (body: { reason: string }): Promise<'ok' | 'uncertain' | false> => {
      if (mutation.isPending) return false;
      let uncertainNow = false;
      setError(null);
      setUncertain(false);
      try {
        setResult(await mutation.mutateAsync(body));
        return 'ok';
      } catch (e) {
        const onCode = (code: CancelEventErrorCode) => () => {
          if (code === 'Event_400_31') {
            setReasonError(CANCEL_EVENT_ERROR_MESSAGE[code]);
            return;
          }
          setError(CANCEL_EVENT_ERROR_MESSAGE[code]);
          refetchEvent();
        };
        handleError(
          e,
          {
            Event_400_28: onCode('Event_400_28'),
            Event_400_29: onCode('Event_400_29'),
            Event_400_31: onCode('Event_400_31'),
          },
          {
            otherwise: (err) => {
              if (isForbidden(err)) {
                setError(CANCEL_EVENT_FORBIDDEN_MESSAGE);
                refetchEvent();
              } else if (isNotFound(err)) {
                setError(CANCEL_EVENT_UNSUPPORTED_MESSAGE);
              } else if (getErrorStatus(err) === 0) {
                // 서버가 취소했을 수 있다 — GE-3을 다시 읽으면 취소 표시가 보이고, 같은 API로 이어 간다
                uncertainNow = true;
                setUncertain(true);
                setError(CANCEL_EVENT_UNCERTAIN_MESSAGE);
                refetchEvent();
              } else {
                handleError(err);
              }
            },
          },
        );
        return uncertainNow ? 'uncertain' : false;
      }
    },
    [mutation, refetchEvent],
  );

  /**
   * [공연 취소] — 사유를 검사하고 보낸다. 취소했으면 `'canceled'`, 응답을 받지 못했으면 `'uncertain'`(둘 다 오버레이를 닫는다 —
   * [남은 주문 다시 처리]는 대시보드에 있다), 그 밖의 실패는 `false`(열린 채)
   */
  const cancel = useCallback(async (): Promise<'canceled' | 'uncertain' | false> => {
    if (!canCancelEvent(event, role)) return false;
    const invalid = cancelReasonError(reason);
    if (invalid) {
      setReasonError(invalid);
      return false;
    }
    const outcome = await run({ reason: reason.trim() });
    if (outcome === 'ok') setReasonState('');
    return outcome === 'ok' ? 'canceled' : outcome === 'uncertain' ? 'uncertain' : false;
  }, [event, reason, role, run]);

  /**
   * [남은 주문 다시 처리] — 이미 취소된 공연이면 서버가 사유를 보지 않는다(멱등). 처음 사유를 그대로 보낸다. 응답을 못 받아
   * 취소됐는지 모를 때는 입력해 둔 사유를 보낸다(성공하면 칸을 비운다)
   */
  const retry = useCallback(async () => {
    const outcome = await run({
      reason: event.cancelReason ?? result?.cancelReason ?? reason.trim(),
    });
    if (outcome === 'ok') setReasonState('');
    return outcome === 'ok';
  }, [event.cancelReason, reason, result?.cancelReason, run]);

  const summary = result ? cancelResultSummary(result) : null;

  return {
    /** 취소된 공연인지(GE-3 `canceledAt`) */
    canceled,
    canceledAt: event.canceledAt ?? null,
    cancelReason: event.cancelReason ?? null,
    /** [공연 취소]를 보일지 */
    canCancel: canCancelEvent(event, role),
    /** [남은 주문 다시 처리]를 보일지 — 마스터 + (취소된 공연 또는 응답을 못 받음) + 마지막 결과가 "남은 것 없음"이 아님 */
    canRetry: isMaster && (canceled || uncertain) && (summary === null || summary.needsRetry),
    reason,
    setReason,
    reasonError,
    /** 칸 밖 안내(코드 문구) */
    error,
    dismissError: () => setError(null),
    pending: mutation.isPending,
    cancel,
    retry,
    /** 이 화면에서 마지막으로 처리한 결과 */
    result,
    summary,
  };
}
