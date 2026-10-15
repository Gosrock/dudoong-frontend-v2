import { isServer, QueryClient } from '@tanstack/react-query';

import { ApiError } from './errors';

/**
 * 5xx와 네트워크 오류에서만 1회 재시도한다(tech-decisions §4 QueryClient 기본 옵션).
 * 파싱 실패(`PARSE_ERROR`)는 다시 불러도 같으니 재시도하지 않는다.
 */
function shouldRetry(failureCount: number, error: unknown) {
  if (failureCount >= 1) return false;
  if (error instanceof ApiError) return error.status >= 500 && error.code !== 'PARSE_ERROR';
  // fetch의 네트워크 실패는 TypeError, ky 타임아웃은 TimeoutError
  return error instanceof TypeError || (error instanceof Error && error.name === 'TimeoutError');
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 조작 화면·viewer 쿼리 기준 0. 공개 프리페치 쿼리는 queryOptions에서 30초를 준다(tech-decisions §4).
        staleTime: 0,
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
