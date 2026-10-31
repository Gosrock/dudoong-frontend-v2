import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { api } from '../http';
import { pageInfinite, type PageParams } from '../shared/page';
import {
  HostDetailSchema,
  HostEventPageSchema,
  HostMembersSchema,
  HostViewerSchema,
  MyHostPageSchema,
} from './schema';

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

/**
 * GH-6 멤버 목록(일반 멤버 이상). 호스트 홈은 `myRole`이 있을 때만 `enabled`로 부른다(아바타 줄, plan P5c).
 * 비멤버는 403 `HOST_400_2`다.
 */
export const hostMembersQuery = (hostId: string | number) =>
  queryOptions({
    queryKey: ['hosts', String(hostId), 'members'],
    queryFn: ({ signal }) =>
      api.get(`hosts/${encodeURIComponent(hostId)}/members`, HostMembersSchema, { signal }),
  });

// ─── 호스팅 센터 ─────────────────────────────────────────────

/**
 * 호스팅 센터 조회의 기본값(plan P10a "호스팅 센터용 쿼리 기본값"). 조작 화면이라 전역 기본값을 그대로 쓴다 —
 * `staleTime` 0(마운트·포커스마다 최신으로), `retry` 5xx·네트워크 1회, `refetchOnWindowFocus` 켬(tech-decisions §4 기본 옵션 표).
 * 서버에서 조회하지 않는다: `hosting/layout.tsx`의 게이트가 세션을 확정한 뒤에만 화면을 그려 브라우저에서만 부른다.
 * 쿼리마다 따로 덮지 않으므로 여기에는 값을 두지 않고, 바뀌면 이 주석과 각 `queryOptions`를 같이 고친다.
 */

/** 내 호스트 목록 전체(검색어마다 키가 다르다)의 접두 키 — 호스트를 만든 뒤·마스터 양도 뒤 무효화(patterns §22) */
export const MY_HOSTS_KEY = ['me', 'hosts'] as const;

export type MyHostsParams = PageParams & {
  /** 호스트 이름 부분일치, 50자까지(51자는 400) */
  keyword?: string;
};

/**
 * GH-1 내 호스트(로그인, 무한 목록 — patterns §12). 카드형 기본 크기 10. 빈 검색어는 보내지 않는다(키도 같게).
 * 정렬은 서버 순서 그대로 — 호스트 id 큰 순(432cce4)이라 방금 만든 호스트가 첫 페이지 맨 앞에 온다.
 */
export const myHostsQuery = (params: MyHostsParams = {}) => {
  const keyword = params.keyword?.trim();
  const p = {
    ...(keyword && { keyword }),
    ...(params.size !== undefined && { size: params.size }),
  };
  return infiniteQueryOptions({
    ...pageInfinite,
    queryKey: [...MY_HOSTS_KEY, 'infinite', p],
    queryFn: ({ pageParam, signal }) => {
      const searchParams = new URLSearchParams();
      if (p.keyword) searchParams.set('keyword', p.keyword);
      searchParams.set('page', String(pageParam));
      if (p.size !== undefined) searchParams.set('size', String(p.size));
      return api.get('me/hosts', MyHostPageSchema, { searchParams, signal });
    },
  });
};
