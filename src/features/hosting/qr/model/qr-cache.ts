import type { QueryClient } from '@tanstack/react-query';

import { checkInStatsQuery } from '@/api/check-in/queries';
import { eventManageQuery } from '@/api/event/queries';

/**
 * 호스트 스캔(PQ-2) 뒤 캐시 반영(plan P13b "체크인 통계가 스캔 뒤 갱신").
 * 결과마다 GQ-1만 정확한 키로 다시 읽는다 — 다른 스캐너(다른 기기·멤버)의 입장도 함께 반영된다.
 * 대시보드(GD-1 `entranceStats`)·발급 티켓(GI-1)은 QR 화면에 없고 기본 `staleTime` 0이라 열 때 다시 읽으므로 건드리지 않는다.
 */
export const invalidateAfterScan = (qc: QueryClient, eventId: string) =>
  qc.invalidateQueries({ queryKey: checkInStatsQuery(eventId).queryKey, exact: true });

/** `Event_400_27`(스캔 사이에 공연 상태가 바뀜) 뒤 — GE-3을 다시 읽어 공연 상태별 안내를 새 상태로 */
export const invalidateEventStatus = (qc: QueryClient, eventId: string) =>
  qc.invalidateQueries({ queryKey: eventManageQuery(eventId).queryKey, exact: true });
