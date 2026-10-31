import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { isApiError, isSessionLost } from '../errors';
import { api } from '../http';
import { ensureSessionFlag } from '../session-flag';
import { pageInfinite, type PageParams } from '../shared/page';
import {
  ArchiveSchema,
  type FollowingHostFilter,
  FollowingHostPageSchema,
  type Me,
  MeSchema,
} from './schema';

/** 세션 쿼리 `staleTime` — 5분 안에는 마운트·포커스로 다시 부르지 않는다(tech-decisions §4, plan P4a) */
export const SESSION_STALE_MS = 5 * 60_000;

/**
 * GM-1 세션 쿼리. 브라우저에서만 쓴다 — 서버 조회에는 쿠키가 없어 언제나 401이다(`<Prefetch>`에 넣지 않는다).
 * 결과는 셋(tech-decisions §4 인증 표):
 * - **세션**(`Me`) — `dd:session`이 없으면 이때 세운다(ITP가 지웠거나 v1에서 넘어온 사용자)
 * - **`null`** — `dd:session` 없는 401, 또는 재발급이 세션 상실로 끝남(`SessionLostError` — 이동은 `onSessionLost`가 한다)
 * - **throw** — GM-1 자체의 5xx·네트워크 오류, 재발급 일시 오류. 게이트는 전체 화면 재시도를 그린다
 *
 * 로그인·로그아웃·프로필 수정 뒤에는 이 키를 직접 갱신한다.
 */
export const meQuery = () =>
  queryOptions({
    queryKey: ['me'],
    staleTime: SESSION_STALE_MS,
    refetchOnWindowFocus: true,
    queryFn: async ({ signal }): Promise<Me | null> => {
      try {
        const me = await api.get('me', MeSchema, { signal });
        ensureSessionFlag();
        return me;
      } catch (e) {
        if (isSessionLost(e)) return null;
        // 플래그 없는 401(익명). 플래그가 있으면 api가 이미 재발급을 거쳤고, 다시 보낸 요청의 401만 여기 온다 — 그것도 익명으로 본다
        if (isApiError(e) && e.status === 401) return null;
        throw e;
      }
    },
  });

/** 관심 호스트 목록 전체(필터마다 키가 다르다)의 접두 키 — 해제 뒤 모든 필터의 캐시에서 뺄 때 */
export const FOLLOWING_HOSTS_KEY = ['me', 'following-hosts'] as const;

export type FollowingHostsParams = PageParams & { status?: FollowingHostFilter };

/**
 * GM-4 관심 호스트(로그인, 무한 목록 — patterns §12). 최근 팔로우 순. `status` 기본 `ALL`.
 * 해제는 PH-13 DELETE(`unfollowHostMutation`) — 화면이 응답 뒤 이 키들에서 그 호스트를 뺀다.
 */
export const followingHostsQuery = (params: FollowingHostsParams = {}) => {
  const p = {
    status: params.status ?? 'ALL',
    ...(params.size !== undefined && { size: params.size }),
  };
  return infiniteQueryOptions({
    ...pageInfinite,
    queryKey: [...FOLLOWING_HOSTS_KEY, 'infinite', p],
    queryFn: ({ pageParam, signal }) =>
      api.get('me/following-hosts', FollowingHostPageSchema, {
        searchParams: { ...p, page: pageParam },
        signal,
      }),
  });
};

export type ArchiveParams = PageParams & { year?: number | null };

/**
 * GM-5 관람 공연 아카이빙(로그인, 무한 목록). `year`가 없으면 전체. 응답이 `{years, events: 페이지}`라
 * 다음 페이지 판단은 `events`로 한다. 연도 탭(`years`)은 어느 페이지에나 같은 값으로 온다.
 */
export const archiveQuery = (params: ArchiveParams = {}) => {
  const p = {
    year: params.year ?? null,
    ...(params.size !== undefined && { size: params.size }),
  };
  return infiniteQueryOptions({
    initialPageParam: 0,
    getNextPageParam: (last: { events: { page: number; hasNext: boolean } }) =>
      last.events.hasNext ? last.events.page + 1 : undefined,
    queryKey: ['me', 'archive', 'infinite', p],
    queryFn: ({ pageParam, signal }) => {
      const searchParams: Record<string, number> = { page: pageParam };
      if (p.year !== null) searchParams.year = p.year;
      if (p.size !== undefined) searchParams.size = p.size;
      return api.get('me/archive', ArchiveSchema, { searchParams, signal });
    },
  });
};
