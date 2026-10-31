'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { hostCheckInMutation } from '@/api/check-in/mutations';
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
  HOST_SCAN_BLOCK_MESSAGE,
  hostScanBlockOf,
  hostScanErrorOutcome,
  type HostScanFailure,
  isRepeatedScan,
  type LastScan,
  normalizeScanValue,
  SCAN_COOLDOWN_MS,
} from './qr-check-in-rules';

export type HostScanState =
  | { status: 'idle' }
  /** PQ-2 요청 중 */
  | { status: 'checking'; value: string }
  /** 결과 5종(+ 모르는 값 UNKNOWN) — `features/shared/checkin-result`의 호스트 화면 상태 */
  | { status: 'result'; value: string; view: Extract<CheckInResultView, { kind: 'result' }> }
  /** 티켓 QR이 아니다(64자 넘음 · 서버 400 `BAD_REQUEST`) */
  | { status: 'invalidQr' }
  /** `Event_400_27` — 스캔 사이에 공연이 준비중·지난 공연이 됐다 */
  | { status: 'eventNotCheckable'; message: string }
  /** 네트워크·서버 실패(다시 시도) 또는 403·404 */
  | { status: 'failed'; value: string; failure: HostScanFailure };

/** `submitScan`이 한 일 — V 카메라가 소리·진동을 고를 때 쓴다 */
export type ScanSubmitOutcome =
  /** PQ-2를 보냈다 */
  | 'sent'
  /** 요청 중이라 다음 값으로 대기시켰다(가장 최근 값 하나만) */
  | 'queued'
  /** 빈 값 · 요청 중인 값과 같음 · 쿨다운 안의 같은 값 */
  | 'ignored'
  /** 티켓 QR이 아니다 */
  | 'invalid'
  /** 공연 상태가 입장 처리를 막는다 */
  | 'blocked';

/**
 * [호스트가 스캔] 모드(PQ-2, plan P13b). V의 카메라(`@yudiel/react-qr-scanner`)가 인식할 때마다 `submitScan(value)`를 부른다 —
 * 최소 화면은 글자 입력으로 대신한다. UI 동작은 없다. 공연 스코프 레이아웃 안에서 쓴다(GE-3 `useEventScope`).
 *
 * - 공연 상태: OPEN·정산중만(`block`·`blockMessage`). 막혔으면 요청하지 않는다
 * - 결과(200 + `result`) → `checkInResultView(…, 'host')`. 현장 확인 이름은 `ownerName`. 결과마다 GQ-1을 다시 읽는다
 * - 연속 스캔(patterns §19): 같은 값은 끝난 뒤 `cooldownMs` 동안 무시, 요청 중 들어온 다른 값은 하나만 대기시켰다가 이어서 보낸다
 * - `Event_400_27` → `eventNotCheckable` + GE-3 다시 읽기. 네트워크·5xx → `failed` + `retry()`(같은 값, 쿨다운 무시).
 *   에러는 모두 화면이 맡는다(`handleError`의 `otherwise` — 공용 토스트 없음). 세션 상실은 이동이 맡는다
 * - `reset()` — 결과·실패를 지우고 다음 스캔을 기다린다(요청 중이면 무시)
 */
export function useHostScan(
  eventId: string,
  { cooldownMs = SCAN_COOLDOWN_MS, now = () => Date.now() } = {},
) {
  const queryClient = useQueryClient();
  const { event } = useEventScope(eventId);
  const block = hostScanBlockOf(event.status);
  const [state, setState] = useState<HostScanState>({ status: 'idle' });

  const last = useRef<LastScan | null>(null);
  const pendingValue = useRef<string | null>(null);
  const queued = useRef<string | null>(null);

  // GQ-1 다시 읽기는 화면이 사라져도 해야 하므로 옵션의 onSuccess에 둔다(기다리지 않는다)
  const mutation = useMutation({
    ...hostCheckInMutation(eventId),
    onSuccess: (res) => {
      void invalidateAfterScan(queryClient, eventId, res.result);
    },
  });
  const { mutateAsync } = mutation;

  /** 요청이 끝났다 — 쿨다운 시각을 끝난 때로 옮기고, 대기 값이 있으면(`drain`) 돌려준다 */
  const finish = useCallback(
    (value: string, next: HostScanState | null, drain: boolean): string | null => {
      pendingValue.current = null;
      last.current = { value, at: now() };
      if (next) setState(next);
      const q = queued.current;
      queued.current = null;
      return drain && q !== null && !isRepeatedScan(q, last.current, now(), cooldownMs) ? q : null;
    },
    [now, cooldownMs],
  );

  const send = useCallback(
    (first: string) => {
      const run = (value: string) => {
        pendingValue.current = value;
        last.current = { value, at: now() };
        setState({ status: 'checking', value });
        const then = (next: string | null) => {
          if (next !== null) run(next);
        };
        void (async () => {
          // 성공 뒤 대기 값을 이어 보내므로(`then` → `run`) try 블록에 넣지 않고 tryCatch로 받는다
          const [res, error] = await tryCatch(mutateAsync({ ticketUuid: value }));
          if (!error) {
            const view = checkInResultView(res, 'host');
            // 호스트 스캔에 SELECT_TICKET이 오면 checkInResultView가 UNKNOWN으로 바꾼다 — `select`는 오지 않는다
            then(
              finish(
                value,
                view.kind === 'result' ? { status: 'result', value, view } : { status: 'idle' },
                true,
              ),
            );
            return;
          }
          if (isSessionLost(error)) {
            finish(value, null, false);
            return;
          }
          handleError(
            error,
            {},
            {
              otherwise: (e) => {
                const outcome = hostScanErrorOutcome(e);
                if (outcome.kind === 'eventNotCheckable') {
                  finish(
                    value,
                    { status: 'eventNotCheckable', message: EVENT_NOT_CHECKABLE_MESSAGE },
                    false,
                  );
                  void invalidateEventStatus(queryClient, eventId);
                } else if (outcome.kind === 'invalidQr') {
                  then(finish(value, { status: 'invalidQr' }, true));
                } else {
                  then(finish(value, { status: 'failed', value, failure: outcome.failure }, true));
                }
              },
            },
          );
        })();
      };
      run(first);
    },
    [mutateAsync, now, finish, queryClient, eventId],
  );

  const submitScan = useCallback(
    (raw: string): ScanSubmitOutcome => {
      if (block !== null) return 'blocked';
      const scan = normalizeScanValue(raw);
      if (scan.kind === 'empty') return 'ignored';
      if (scan.kind === 'invalid') {
        if (pendingValue.current === null) setState({ status: 'invalidQr' });
        return 'invalid';
      }
      const value = scan.ticketUuid;
      if (pendingValue.current !== null) {
        if (pendingValue.current === value) return 'ignored';
        queued.current = value;
        return 'queued';
      }
      if (isRepeatedScan(value, last.current, now(), cooldownMs)) return 'ignored';
      send(value);
      return 'sent';
    },
    [block, now, cooldownMs, send],
  );

  /** `failed`(다시 시도할 수 있는 것)일 때 같은 값을 다시 보낸다 — 쿨다운을 보지 않는다 */
  const retry = useCallback(() => {
    if (state.status !== 'failed' || !state.failure.canRetry) return;
    if (pendingValue.current !== null || block !== null) return;
    send(state.value);
  }, [state, block, send]);

  const reset = useCallback(() => {
    if (pendingValue.current !== null) return;
    queued.current = null;
    setState({ status: 'idle' });
  }, []);

  return {
    state,
    /** 스캔 값 하나를 넣는다(V 카메라의 인식 콜백) */
    submitScan,
    retry,
    reset,
    /** 요청 중 */
    checking: mutation.isPending,
    /** 공연 상태가 입장 처리를 막는 이유(준비중 · 지난 공연 · 모르는 상태) */
    block,
    blockMessage: block ? HOST_SCAN_BLOCK_MESSAGE[block] : null,
  };
}
