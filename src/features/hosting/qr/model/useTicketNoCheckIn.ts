'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { hostCheckInByTicketNoMutation } from '@/api/check-in/mutations';
import { isSessionLost } from '@/api/errors';
import { handleError } from '@/api/handle-error';
import { cancelEntranceMutation } from '@/api/issued-ticket/mutations';
import { invalidateEventStatus } from '@/features/hosting/shared/model/event-cache';
import { invalidateAfterScan } from '@/features/hosting/shared/model/qr-cache';
import {
  EVENT_NOT_CHECKABLE_MESSAGE,
  hostScanBlockOf,
  hostScanErrorOutcome,
  type HostScanFailure,
  normalizeTicketNoInput,
  TICKET_NO_INVALID_MESSAGE,
} from '@/features/hosting/shared/model/qr-check-in-rules';
import { useEventScope } from '@/features/hosting/shared/model/useEventScope';
import {
  type CheckInResultView,
  checkInResultView,
} from '@/features/shared/checkin-result/model/checkin-result';
import { can } from '@/features/shared/permission/model/can';
import { tryCatch } from '@/utils/try-catch';

export type TicketNoCheckInState =
  | { status: 'idle' }
  | { status: 'checking'; ticketNo: string }
  /** 결과 5종(+ UNKNOWN). 입장 처리면 `view.ticket.ownerName`을 크게 — 번호는 추측할 수 있다(#926) */
  | {
      status: 'result';
      ticketNo: string;
      view: Extract<CheckInResultView, { kind: 'result' }>;
      /** 입장 취소(Q-3)에 쓰는 티켓 uuid — 화면에는 보이지 않는다 */
      ticketUuid: string | null;
    }
  /** 빈 값 · 20자 넘음 · 서버 400 `BAD_REQUEST` — 칸 오류 */
  | { status: 'invalid'; message: string }
  /** `Event_400_27` — 공연이 준비중 · 지난 공연이 됐다 */
  | { status: 'eventNotCheckable'; message: string }
  /** 네트워크 · 서버 실패(다시 시도) 또는 403 · 404 */
  | { status: 'failed'; ticketNo: string; failure: HostScanFailure };

/** 입장 취소 결과 — `stale`은 서버 상태가 이미 바뀜(카드를 지웠다, 안내 `message`), `failed`는 그대로(공용 토스트가 알렸다) */
export type CancelEntranceOutcome =
  { kind: 'done' } | { kind: 'stale'; message: string } | { kind: 'failed' };

/** 입장 취소 확인(GUI `1372:18887` 문구 그대로 — 예매자 관리 `1030:9318`과 같은 말) */
export const CANCEL_ENTRANCE_CONFIRM = {
  title: '입장 처리를 취소할까요?',
  description: '입장 인원에서 빠지고, 다시 입장할 수 있는 상태가 돼요.',
  confirmLabel: '입장 취소',
  cancelLabel: '돌아가기',
} as const;

/** 입장 취소 성공 토스트(GUI `1372:19151`) */
export const CANCEL_ENTRANCE_DONE_MESSAGE = '입장 처리를 취소했어요.';

/** 입장 취소 — 상태가 이미 바뀜(예매자 관리와 같은 말, 🤖 404는 이 화면 말) */
export const CANCEL_ENTRANCE_STALE_MESSAGE = {
  IssuedTicket_400_9: '입장 전 티켓이에요. 최신 상태를 불러왔어요',
  IssuedTicket_400_3: '취소된 티켓이라 입장을 취소할 수 없어요. 최신 상태를 불러왔어요',
  IssuedTicket_404_1: '티켓을 찾을 수 없어요. 최신 상태를 불러왔어요',
} as const;

/**
 * 티켓 번호로 입장 처리(PQ-2b — 백엔드 #926, plan P13b · 이슈 #93 §5). 카메라를 쓸 수 없는 현장용. UI 동작은 없다.
 * 판정 · 에러 분류는 QR 스캔(`useHostScan`)과 같다 — 결과는 `checkInResultView(…, 'host')`, 에러는 `hostScanErrorOutcome`.
 * 연속 스캔 스로틀은 없다(사람이 누른다) — 요청 중에는 다시 보내지 않는다. 결과마다 GQ-1(통계)을 다시 읽는다.
 */
export function useTicketNoCheckIn(eventId: string) {
  const queryClient = useQueryClient();
  const { event, role } = useEventScope(eventId);
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
          view.kind === 'result'
            ? { status: 'result', ticketNo, view, ticketUuid: res.ticket?.ticketUuid ?? null }
            : { status: 'idle' },
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

  // ─── 입장 취소(Q-3 — 매니저 이상, 백엔드 #929 B37) — P13b-GUI 번호 입장 완료 카드 [입장 취소](`1372:18887` · `1372:19151`) ───
  // 예매자 관리 티켓 상세의 입장 취소(`hosting/guest`)와 같은 API · 같은 다시 읽기 범위(`invalidateAfterScan('ENTERED')`).
  // 번호 입장은 관객 이름을 보고 확인하는 흐름이라, 다른 사람이면 그 자리에서 되돌린다
  const cancelM = useMutation(cancelEntranceMutation(eventId));
  const canCancelEntrance = can(role, 'cancelEntrance') && block === null;
  const cancelEntrance = useCallback(async (): Promise<CancelEntranceOutcome> => {
    if (!canCancelEntrance || cancelM.isPending) return { kind: 'failed' };
    if (state.status !== 'result' || state.view.result !== 'ENTERED') return { kind: 'failed' };
    const uuid = state.ticketUuid;
    if (!uuid) return { kind: 'failed' };
    const [, error] = await tryCatch(cancelM.mutateAsync(uuid));
    if (!error) {
      void invalidateAfterScan(queryClient, eventId, 'ENTERED');
      setState({ status: 'idle' });
      return { kind: 'done' };
    }
    if (isSessionLost(error)) return { kind: 'failed' };
    // 이미 바뀐 상태(입장 전 · 취소된 티켓 · 없는 티켓) → 카드를 지우고 최신 통계를 다시 읽는다(patterns §11 "이미 처리됨")
    const stale = (message: string): CancelEntranceOutcome => {
      setState({ status: 'idle' });
      void invalidateAfterScan(queryClient, eventId, 'ENTERED');
      return { kind: 'stale', message };
    };
    let outcome: CancelEntranceOutcome = { kind: 'failed' };
    handleError(error, {
      IssuedTicket_400_9: () => (outcome = stale(CANCEL_ENTRANCE_STALE_MESSAGE.IssuedTicket_400_9)),
      IssuedTicket_400_3: () => (outcome = stale(CANCEL_ENTRANCE_STALE_MESSAGE.IssuedTicket_400_3)),
      IssuedTicket_404_1: () => (outcome = stale(CANCEL_ENTRANCE_STALE_MESSAGE.IssuedTicket_404_1)),
      Event_400_27: () => {
        setState({ status: 'eventNotCheckable', message: EVENT_NOT_CHECKABLE_MESSAGE });
        void invalidateEventStatus(queryClient, eventId);
        outcome = { kind: 'stale', message: EVENT_NOT_CHECKABLE_MESSAGE };
      },
    });
    return outcome;
  }, [canCancelEntrance, cancelM, state, queryClient, eventId]);

  return {
    state,
    submit,
    retry,
    reset,
    checking: mutation.isPending,
    /** [입장 취소] — 매니저 이상 + 공연 OPEN·정산중, 번호 입장 완료(`ENTERED`) 카드에만 */
    entranceCancel: {
      can: canCancelEntrance,
      run: cancelEntrance,
      pending: cancelM.isPending,
    },
    /** 공연 상태가 입장 처리를 막으면 칸을 그리지 않는다(QR 스캔 자리가 안내를 보인다) */
    blocked: block !== null,
  };
}
