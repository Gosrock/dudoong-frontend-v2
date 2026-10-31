'use client';

import { useQuery } from '@tanstack/react-query';

import { checkInQrQuery } from '@/api/check-in/queries';
import { useEventScope } from '@/features/hosting/event/model/useEventScope';

import {
  SELF_CHECK_IN_BLOCK_MESSAGE,
  SELF_CHECK_IN_ENDED_HINT,
  selfCheckInBlockOf,
  selfCheckInUrl,
} from './qr-check-in-rules';

const browserOrigin = () => (typeof window === 'undefined' ? '' : window.location.origin);

/**
 * [관객이 스캔] 모드(GQ-4, plan P13b). 관객이 찍을 셀프 체크인 QR 주소(`origin + qrPath`)를 돌려준다 — 그림은 V.
 * 공연 스코프 레이아웃 안에서 쓴다(GE-3 `useEventScope`).
 *
 * - 셀프 체크인은 OPEN 공연만 — 정산중·지난 공연·준비중이면 GQ-4를 부르지 않고 `blocked` + 안내(`guidance`)
 * - 토큰은 공연별 고정이라 한 번만 읽는다(`staleTime: Infinity`). 토큰 자체는 돌려주지 않는다(QR 주소에만 — DEC-011)
 * - 실패 → `error` + `retry()`. 서버 `qrPath`가 같은 출처 경로가 아니면(계약 밖) `error`
 */
export function useSelfCheckInQr(eventId: string, { origin = browserOrigin } = {}) {
  const { event } = useEventScope(eventId);
  const block = selfCheckInBlockOf(event.status);
  const q = useQuery({ ...checkInQrQuery(eventId), enabled: block === null });
  const qrUrl = q.data ? selfCheckInUrl(origin(), q.data.qrPath) : null;
  const status: 'blocked' | 'pending' | 'error' | 'ready' =
    block !== null
      ? 'blocked'
      : q.status === 'pending'
        ? 'pending'
        : q.status === 'error' || qrUrl === null
          ? 'error'
          : 'ready';
  return {
    status,
    /** 셀프 체크인을 막는 이유(`ended` 정산중·지난 공연 · `notRegistered` 준비중 · `unknown`) */
    block,
    /** 막혔을 때 안내 */
    guidance: block ? SELF_CHECK_IN_BLOCK_MESSAGE[block] : null,
    /** 끝난 공연이면 다음 행동 안내 */
    hint: block === 'ended' ? SELF_CHECK_IN_ENDED_HINT : null,
    /** QR에 넣을 주소(`ready`일 때만) */
    qrUrl: status === 'ready' ? qrUrl : null,
    retry: () => void q.refetch(),
  };
}
