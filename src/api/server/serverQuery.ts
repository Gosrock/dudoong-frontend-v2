import 'server-only';

import { type FetchQueryOptions, QueryClient, type QueryKey } from '@tanstack/react-query';
import { notFound, unstable_rethrow } from 'next/navigation';
import { cache } from 'react';

import { log } from '@/utils/log';

import { ApiError } from '../errors';

/** 요청 하나 안에서 generateMetadata 와 페이지가 같은 QueryClient 를 쓴다(React `cache`). */
export const getRequestQueryClient = cache(
  () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } }),
);

/** 서버 조회. 404면 `notFound()`. 토큰을 싣지 않는다(공개 GET만 서버에서 부른다). */
export async function serverQuery<T, K extends QueryKey>(
  options: FetchQueryOptions<T, Error, T, K>,
): Promise<T> {
  try {
    return await getRequestQueryClient().fetchQuery(options);
  } catch (e) {
    // 프리렌더 중단 같은 Next 내부 신호는 로그 없이 그대로 다시 던진다
    unstable_rethrow(e);
    if (e instanceof ApiError && e.status === 404) notFound();
    // 쿼리 키 첫 원소(리소스 이름)만 남긴다. id·토큰은 남기지 않는다(tech-decisions §13).
    log('error', 'server_query.failed', {
      resource: String(options.queryKey[0]),
      status: e instanceof ApiError ? e.status : undefined,
      code: e instanceof ApiError ? e.code : e instanceof Error ? e.name : 'unknown',
    });
    throw e;
  }
}
