import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { api } from '../http';
import { pageInfinite, type PageParams } from '../shared/page';
import { HostDetailSchema, HostEventPageSchema, HostViewerSchema } from './schema';

/**
 * GH-3·GH-14는 사용자별 값이 섞인다(`isFollowing`·`myRole`, 멤버에게만 보이는 준비중 공연).
 * 공개 쿼리(쿠키 없음)와 viewer 쿼리(쿠키, 세션이 있을 때만 `enabled`)로 키를 나눈다(tech-decisions §4, patterns §4-2).
 */

/** GH-3 호스트 홈 — 공개 필드. 라우트 파일이 `<Prefetch>`로 서버에서 읽는다. */
export const hostDetailQuery = (hostId: string | number) =>
  queryOptions({
    queryKey: ['hosts', String(hostId)],
    staleTime: 30_000,
    queryFn: ({ signal }) =>
      api.get(`hosts/${encodeURIComponent(hostId)}`, HostDetailSchema, { public: true, signal }),
  });

/** GH-3 호스트 홈 — 사용자별 필드. 브라우저에서만, 세션이 확정된 뒤 `enabled`로 부른다. 프리페치하지 않는다. */
export const hostViewerQuery = (hostId: string | number) =>
  queryOptions({
    queryKey: ['hosts', String(hostId), 'viewer'],
    queryFn: ({ signal }) =>
      api.get(`hosts/${encodeURIComponent(hostId)}`, HostViewerSchema, { signal }),
  });

function hostEventsFetcher(hostId: string | number, size: number | undefined, isPublic: boolean) {
  return ({ pageParam, signal }: { pageParam: number; signal: AbortSignal }) => {
    const searchParams = new URLSearchParams({ page: String(pageParam) });
    if (size !== undefined) searchParams.set('size', String(size));
    return api.get(`hosts/${encodeURIComponent(hostId)}/events`, HostEventPageSchema, {
      public: isPublic,
      searchParams,
      signal,
    });
  };
}

/** GH-14 호스트 공연 목록 — 공개 공연만(비멤버). 브라우저 `useInfiniteQuery`로만 읽는다(patterns §12). */
export const hostEventsQuery = (hostId: string | number, params: PageParams = {}) =>
  infiniteQueryOptions({
    ...pageInfinite,
    queryKey: ['hosts', String(hostId), 'events', 'infinite', { size: params.size }],
    queryFn: hostEventsFetcher(hostId, params.size, true),
  });

/** GH-14 — 멤버용(준비중 포함). 세션이 있고 멤버로 확정됐을 때만 `enabled`. */
export const hostEventsViewerQuery = (hostId: string | number, params: PageParams = {}) =>
  infiniteQueryOptions({
    ...pageInfinite,
    queryKey: ['hosts', String(hostId), 'events', 'viewer', 'infinite', { size: params.size }],
    queryFn: hostEventsFetcher(hostId, params.size, false),
  });
