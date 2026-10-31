import type { QueryClient } from '@tanstack/react-query';

import { checkInStatsQuery } from '@/api/check-in/queries';
import type { CheckInResult } from '@/api/check-in/schema';
import { eventDashboardQuery } from '@/api/dashboard/queries';
import { eventManageQuery } from '@/api/event/queries';
import { hostIssuedTicketsKey } from '@/api/issued-ticket/queries';

/**
 * 호스트 스캔(PQ-2) 뒤 캐시 반영(plan P13b "체크인 통계가 스캔 뒤 갱신").
 * 결과마다 GQ-1을 정확한 키로 다시 읽는다 — 다른 스캐너(다른 기기·멤버)의 입장도 함께 반영된다.
 * 입장 처리가 된 결과(`ENTERED`)면 입장 상태가 바뀌므로 발급 티켓(GI-1·GI-2 — 입장 필터·입장 시각)과
 * 대시보드(GD-1 `entranceStats`)도 무효화한다(계약 대조 2026-10-31). 열려 있지 않은 쿼리는 표시만 바뀌고 열 때 다시 읽는다
 */
export const invalidateAfterScan = (qc: QueryClient, eventId: string, result?: CheckInResult) =>
  Promise.all([
    qc.invalidateQueries({ queryKey: checkInStatsQuery(eventId).queryKey, exact: true }),
    ...(result === 'ENTERED'
      ? [
          qc.invalidateQueries({ queryKey: hostIssuedTicketsKey(eventId) }),
          qc.invalidateQueries({ queryKey: eventDashboardQuery(eventId).queryKey, exact: true }),
        ]
      : []),
  ]);

/** `Event_400_27`(스캔 사이에 공연 상태가 바뀜) 뒤 — GE-3을 다시 읽어 공연 상태별 안내를 새 상태로 */
export const invalidateEventStatus = (qc: QueryClient, eventId: string) =>
  qc.invalidateQueries({ queryKey: eventManageQuery(eventId).queryKey, exact: true });
