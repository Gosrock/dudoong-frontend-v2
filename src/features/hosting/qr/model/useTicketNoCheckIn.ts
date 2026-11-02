'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { hostCheckInByTicketNoMutation } from '@/api/check-in/mutations';
import { isSessionLost } from '@/api/errors';
import { handleError } from '@/api/handle-error';
import { useEventScope } from '@/features/hosting/event/model/useEventScope';
import {
  type CheckInResultView,
  checkInResultView,
} from '@/features/shared/checkin-result/model/checkin-result';
import { tryCatch } from '@/utils/try-catch';

import { invalidateAfterScan, invalidateEventStatus } from './qr-cache';
import {
  EVENT_NOT_CHECKABLE_MESSAGE,
  hostScanBlockOf,
  hostScanErrorOutcome,
  type HostScanFailure,
  normalizeTicketNoInput,
  TICKET_NO_INVALID_MESSAGE,
} from './qr-check-in-rules';

export type TicketNoCheckInState =
  | { status: 'idle' }
  | { status: 'checking'; ticketNo: string }
  /** 결과 5종(+ UNKNOWN). 입장 처리면 `view.ticket.ownerName`을 크게 — 번호는 추측할 수 있다(#926) */
  | {
      status: 'result';
      ticketNo: string;
      view: Extract<CheckInResultView, { kind: 'result' }>;
    }
  /** 빈 값 · 20자 넘음 · 서버 400 `BAD_REQUEST` — 칸 오류 */
  | { status: 'invalid'; message: string }
  /** `Event_400_27` — 공연이 준비중 · 지난 공연이 됐다 */
  | { status: 'eventNotCheckable'; message: string }
  /** 네트워크 · 서버 실패(다시 시도) 또는 403 · 404 */
  | { status: 'failed'; ticketNo: string; failure: HostScanFailure };

/**
 * 티켓 번호로 입장 처리(PQ-2b — 백엔드 #926, plan P13b · 이슈 #93 §5). 카메라를 쓸 수 없는 현장용. UI 동작은 없다.
 * 판정 · 에러 분류는 QR 스캔(`useHostScan`)과 같다 — 결과는 `checkInResultView(…, 'host')`, 에러는 `hostScanErrorOutcome`.
 * 연속 스캔 스로틀은 없다(사람이 누른다) — 요청 중에는 다시 보내지 않는다. 결과마다 GQ-1(통계)을 다시 읽는다.
 */
export function useTicketNoCheckIn(eventId: string) {
  const queryClient = useQueryClient();
  const { event } = useEventScope(eventId);
  const block = hostScanBlockOf(event.status);
  const [state, setState] = useState<TicketNoCheckInState>({ status: 'idle' });
  const inflight = useRef(false);

  const mutation = useMutation({
    ...hostCheckInByTicketNoMutation(eventId),
    onSuccess: (res) => {
      void invalidateAfterScan(queryClient, eventId, res.result);
    },
  });
  const { mutateAsync } = mutation;

  const send = useCallback(
    async (ticketNo: string) => {
      inflight.current = true;
      setState({ status: 'checking', ticketNo });
      const [res, error] = await tryCatch(mutateAsync({ ticketNo }));
      inflight.current = false;
      if (!error) {
        const view = checkInResultView(res, 'host');
        setState(
          view.kind === 'result' ? { status: 'result', ticketNo, view } : { status: 'idle' },
        );
        return;
      }
      if (isSessionLost(error)) return;
      handleError(
        error,
        {},
        {
          otherwise: (e) => {
            const outcome = hostScanErrorOutcome(e);
            if (outcome.kind === 'eventNotCheckable') {
              setState({ status: 'eventNotCheckable', message: EVENT_NOT_CHECKABLE_MESSAGE });
              void invalidateEventStatus(queryClient, eventId);
            } else if (outcome.kind === 'invalidQr') {
              setState({ status: 'invalid', message: TICKET_NO_INVALID_MESSAGE });
            } else {
              setState({ status: 'failed', ticketNo, failure: outcome.failure });
            }
          },
        },
      );
    },
    [mutateAsync, queryClient, eventId],
  );

  /** [입장 처리] — 입력 값을 보낸다. 보냈으면 true */
  const submit = useCallback(
    (raw: string): boolean => {
      if (block !== null || inflight.current) return false;
      const input = normalizeTicketNoInput(raw);
      if (input.kind !== 'ticketNo') {
        setState({ status: 'invalid', message: TICKET_NO_INVALID_MESSAGE });
        return false;
      }
      void send(input.ticketNo);
      return true;
    },
    [block, send],
  );

  /** `failed`(다시 시도할 수 있는 것)일 때 같은 번호를 다시 보낸다 */
  const retry = useCallback(() => {
    if (state.status !== 'failed' || !state.failure.canRetry) return;
    if (inflight.current || block !== null) return;
    void send(state.ticketNo);
  }, [state, block, send]);

  const reset = useCallback(() => {
    if (inflight.current) return;
    setState({ status: 'idle' });
  }, []);

  return {
    state,
    submit,
    retry,
    reset,
    checking: mutation.isPending,
    /** 공연 상태가 입장 처리를 막으면 칸을 그리지 않는다(QR 스캔 자리가 안내를 보인다) */
    blocked: block !== null,
  };
}
