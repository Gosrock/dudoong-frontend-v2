'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { eventListQuery } from '@/api/event/queries';
import { flattenPages } from '@/api/shared/page';

/** "이런 공연은 어때요?"에 보일 카드 수(GUI `1184:33829` 검색결과 없음 — 6장) */
export const RECOMMENDED_COUNT = 6;

/**
 * 검색 결과가 없을 때 아래에 보일 추천 공연(GUI `1184:33829`, design-requests Q91).
 * 서버에 추천 API가 없어 조건 없는 공연 리스트(GP-2, 공연임박순 · 지난 공연 빼고) 첫 페이지 앞 6개를 쓴다 —
 * 조건 없는 공연 리스트와 같은 쿼리 키라 그 화면을 거쳐 왔으면 다시 부르지 않는다.
 * `enabled`가 거짓이면 부르지 않는다. 읽는 중 · 실패 · 0건이면 `items`가 비어 묶음을 그리지 않는다.
 */
export function useRecommendedEvents(enabled: boolean) {
  const query = useInfiniteQuery({ ...eventListQuery(), enabled });
  const items = useMemo(
    () => flattenPages(query.data, (e) => e.eventId).slice(0, RECOMMENDED_COUNT),
    [query.data],
  );
  return { items } as const;
}
