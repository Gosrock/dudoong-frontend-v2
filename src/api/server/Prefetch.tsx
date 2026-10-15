import 'server-only';

import {
  dehydrate,
  type FetchQueryOptions,
  HydrationBoundary,
  type QueryKey,
} from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { getRequestQueryClient, serverQuery } from './serverQuery';

/**
 * `queryOptions()` 결과를 여러 개 받는다. 데이터 타입이 서로 달라 배열 원소 타입을 하나로 묶을 수 없어
 * `queryKey`만 요구하고, 실행할 때 `FetchQueryOptions`로 넘긴다.
 */
type AnyQuery = {
  queryKey: QueryKey;
  queryFn?: unknown;
  // 무한 쿼리는 받지 않는다(첫 페이지 구조가 달라 브라우저 useInfiniteQuery가 깨진다 — tech-decisions §4)
  initialPageParam?: never;
  getNextPageParam?: never;
};

/**
 * 서버에서 조회를 끝낸 뒤 결과를 브라우저 캐시로 넘긴다(블로킹 프리페치 — tech-decisions §4).
 * `(public)` 라우트에서만 쓴다. 위에 Suspense 가 없어야 404 상태 코드가 유지된다(§2).
 */
export async function Prefetch({
  queries,
  children,
}: {
  queries: AnyQuery[];
  children: ReactNode;
}) {
  await Promise.all(
    queries.map((q) => serverQuery(q as FetchQueryOptions<unknown, Error, unknown, QueryKey>)),
  );
  return (
    <HydrationBoundary state={dehydrate(getRequestQueryClient())}>{children}</HydrationBoundary>
  );
}
