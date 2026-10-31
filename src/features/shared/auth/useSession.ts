'use client';

import { useQuery } from '@tanstack/react-query';

import { meQuery } from '@/api/me/queries';
import type { Me } from '@/api/me/schema';

/** GM-1 결과를 화면이 쓰는 네 상태로. pending·error 동안 사용자별 버튼은 비활성 자리표시다(patterns §4-2) */
export type SessionState =
  | { status: 'pending'; me: undefined }
  | { status: 'session'; me: Me }
  | { status: 'anonymous'; me: null }
  | { status: 'error'; me: undefined; error: unknown; retry: () => void };

/**
 * 세션 상태(헤더·사용자별 버튼·viewer 쿼리의 `enabled`). 쿼리는 `meQuery` 하나라 여러 곳이 불러도 요청은 한 번이다.
 * 보호 화면 안에서는 게이트가 이미 세션을 확정했으므로 `useSuspenseQuery(meQuery())`로 바로 읽어도 된다.
 */
export function useSession(): SessionState {
  const q = useQuery(meQuery());
  if (q.data) return { status: 'session', me: q.data };
  if (q.data === null) return { status: 'anonymous', me: null };
  if (q.isError && !q.isFetching) {
    return { status: 'error', me: undefined, error: q.error, retry: () => void q.refetch() };
  }
  return { status: 'pending', me: undefined };
}
