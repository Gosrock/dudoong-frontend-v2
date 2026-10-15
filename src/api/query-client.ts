import { isServer, QueryClient } from '@tanstack/react-query';

import { ApiError } from './errors';

/** 5xx와 네트워크 오류에서만 1회 재시도한다(tech-decisions §4 QueryClient 기본 옵션). */
function shouldRetry(failureCount: number, error: unknown) {
  if (failureCount >= 1) return false;
  if (error instanceof ApiError) return error.status >= 500;
  return true;
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
      },
      mutations: { retry: false },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * Next 공식 가이드 방식. 서버 렌더마다 새로 만들고 브라우저에서는 하나를 재사용한다.
 * 컴포넌트는 이 함수가 아니라 `useQueryClient()`를 쓴다(tech-decisions §4).
 */
export function getQueryClient() {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
