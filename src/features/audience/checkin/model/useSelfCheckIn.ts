'use client';

import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { selfCheckInMutation } from '@/api/check-in/mutations';
import type { CheckInTicket, SelfCheckInRequest } from '@/api/check-in/schema';
import { getErrorCode } from '@/api/errors';
import { handleError, settle } from '@/api/settle';
import {
  type CheckInResultView,
  checkInResultView,
} from '@/features/shared/checkin-result/model/checkin-result';

import {
  SELF_CHECK_IN_ERRORS,
  selfCheckInError,
  type SelfCheckInErrorView,
} from './self-check-in-errors';

export type SelfCheckInState =
  /** 요청 중(첫 요청, 또는 후보를 고른 뒤) */
  | { status: 'checking'; candidates: CheckInTicket[] | null }
  /** 여러 장 — 하나를 고른다. `error`는 고른 티켓이 실패한 이유(`IssuedTicket_400_1` 등) */
  | { status: 'select'; candidates: CheckInTicket[]; error: SelfCheckInErrorView | null }
  | { status: 'result'; view: Extract<CheckInResultView, { kind: 'result' }> }
  | { status: 'error'; error: SelfCheckInErrorView };

/**
 * 관객 셀프 체크인(`/check-in?token=…`, plan P8c). 보호 화면이라 게이트가 세션을 확정한 뒤에 돈다.
 *
 * - 열리면 PQ-5 `{token}`을 **한 번** 보낸다(StrictMode의 effect 두 번에도 한 번). 1장이면 서버가 바로 입장 처리한다
 * - `SELECT_TICKET`이면 후보를 돌려주고, `select(ticketUuid)`가 `{token, ticketUuid}`로 다시 보낸다
 * - 토큰이 없거나 모양이 틀리면(`token === null`) 요청 없이 `INVALID_QR`
 * - 에러는 모두 화면이 맡는다(`handleError`의 `otherwise` — 공용 토스트 없음). 세션 상실은 이동이 맡으므로 상태를 바꾸지 않는다
 */
export function useSelfCheckIn(token: string | null) {
  const [state, setState] = useState<SelfCheckInState>(() =>
    token === null
      ? { status: 'error', error: SELF_CHECK_IN_ERRORS.INVALID_QR }
      : { status: 'checking', candidates: null },
  );
  const candidatesRef = useRef<CheckInTicket[] | null>(null);
  const mutation = useMutation(selfCheckInMutation());
  const { mutateAsync } = mutation;

  const send = useCallback(
    async (body: SelfCheckInRequest) => {
      setState({ status: 'checking', candidates: candidatesRef.current });
      const r = await settle(mutateAsync(body));
      if (r.ok) {
        const view = checkInResultView(r.data, 'self');
        if (view.kind === 'select') {
          candidatesRef.current = view.candidates;
          setState({ status: 'select', candidates: view.candidates, error: null });
        } else {
          setState({ status: 'result', view });
        }
        return;
      }
      handleError(
        r.error,
        {},
        {
          otherwise: (e) => {
            const error = selfCheckInError(getErrorCode(e));
            const candidates = candidatesRef.current;
            // 후보를 고르다 실패하면 고르는 화면에 남는다(다시 고르거나 다시 시도)
            if (body.ticketUuid !== undefined && candidates && error.kind !== 'EVENT_NOT_OPEN') {
              setState({ status: 'select', candidates, error });
            } else {
              setState({ status: 'error', error });
            }
          },
        },
      );
    },
    [mutateAsync],
  );

  const started = useRef(false);
  useEffect(() => {
    if (token === null || started.current) return;
    started.current = true;
    void send({ token });
  }, [token, send]);

  const select = useCallback(
    (ticketUuid: string) => {
      if (token === null || mutation.isPending) return;
      if (!candidatesRef.current?.some((c) => c.ticketUuid === ticketUuid)) return;
      void send({ token, ticketUuid });
    },
    [token, send, mutation.isPending],
  );

  /** `FAILED`일 때 처음부터 다시(토큰만) */
  const retry = useCallback(() => {
    if (token === null || mutation.isPending) return;
    candidatesRef.current = null;
    void send({ token });
  }, [token, send, mutation.isPending]);

  return { state, select, retry, submitting: mutation.isPending };
}
