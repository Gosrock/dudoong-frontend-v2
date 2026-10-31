'use client';

import { useQuery } from '@tanstack/react-query';

import { checkInStatsQuery } from '@/api/check-in/queries';

/**
 * 체크인 통계(GQ-1, plan P13b). 스캔 뒤 다시 읽는다(`invalidateAfterScan`). UI 동작은 없다.
 *
 * - 첫 조회 실패 → `status: 'error'` + `retry()`(전역 토스트 없음 — 첫 로딩 실패 규칙)
 * - 스캔 뒤 다시 읽기 실패(네트워크 차단 등) → 지난 값을 그대로 두고 `refreshFailed`. 스캔마다 토스트가 쌓이지 않게 `meta.silent`
 */
export function useCheckInStats(eventId: string) {
  const q = useQuery({ ...checkInStatsQuery(eventId), meta: { silent: true } });
  return {
    status: q.status,
    /** GQ-1 응답. 발급 0이면 0/0, 입장률 0 */
    stats: q.data ?? null,
    /** 값이 있는데 다시 읽기가 실패했다 — 지난 값이다 */
    refreshFailed: q.isRefetchError,
    /** 값이 있는 채로 다시 읽는 중 */
    refreshing: q.isFetching && q.data !== undefined,
    retry: () => void q.refetch(),
  };
}
