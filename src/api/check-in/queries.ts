import { queryOptions } from '@tanstack/react-query';

import { eventManageKey } from '../event/queries';
import { api } from '../http';
import { CheckInQrSchema, CheckInStatsSchema } from './schema';

/**
 * GQ-1 체크인 통계(일반 멤버 이상). 호스트 스캔(PQ-2)이 입장시키면 바뀌므로 스캔 뒤 다시 읽는다(plan P13b).
 * 키는 GE-3 아래(`['events', id, 'manage', 'check-ins', 'stats']`) — 공연 관리 키 규칙(P11)과 같게. 호스팅 센터 기본값(브라우저에서만)
 */
export const checkInStatsQuery = (eventId: string | number) =>
  queryOptions({
    queryKey: [...eventManageKey(eventId), 'check-ins', 'stats'],
    queryFn: ({ signal }) =>
      api.get(`events/${encodeURIComponent(eventId)}/check-ins/stats`, CheckInStatsSchema, {
        signal,
      }),
  });

/**
 * GQ-4 셀프 체크인 QR(일반 멤버 이상). 공연별 고정 토큰이라 한 번 읽으면 바뀌지 않는다(`staleTime: Infinity`).
 * 서버는 공연 상태를 보지 않는다(없는·지운 공연만 404) — 셀프 체크인이 되는지(OPEN만)는 화면이 GE-3 `status`로 판정한다
 */
export const checkInQrQuery = (eventId: string | number) =>
  queryOptions({
    queryKey: [...eventManageKey(eventId), 'check-in-qr'],
    queryFn: ({ signal }) =>
      api.get(`events/${encodeURIComponent(eventId)}/check-in-qr`, CheckInQrSchema, { signal }),
    staleTime: Infinity,
  });
