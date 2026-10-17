import { queryOptions } from '@tanstack/react-query';

import { api } from '../http';
import { MeSchema } from './schema';

/** 세션 쿼리 `staleTime` — 5분 안에는 마운트·포커스로 다시 부르지 않는다(tech-decisions §4, plan P4a) */
export const SESSION_STALE_MS = 5 * 60_000;

/**
 * GM-1 세션 쿼리. 브라우저에서만 쓴다 — 서버 조회에는 쿠키가 없어 언제나 401이다(`<Prefetch>`에 넣지 않는다).
 * 결과 셋(세션 / `null` / throw)과 401 규칙은 P4a에서 `queryFn`에 붙인다. 지금은 401이면 `ApiError(401)`를 던진다.
 * 로그인·로그아웃·프로필 수정 뒤에는 이 키를 직접 갱신한다.
 */
export const meQuery = () =>
  queryOptions({
    queryKey: ['me'],
    staleTime: SESSION_STALE_MS,
    refetchOnWindowFocus: true,
    queryFn: ({ signal }) => api.get('me', MeSchema, { signal }),
  });
