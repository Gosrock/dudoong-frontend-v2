import 'server-only';

import { type FetchQueryOptions, QueryClient, type QueryKey } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { cache } from 'react';

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
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}
