import { isServer, MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { log } from '@/utils/log';

import { errorMessageOf, notifyError } from './error-toast';
import { ApiError, isApiError, isSessionLost } from './errors';

/**
 * 5xx와 네트워크 오류에서만 1회 재시도한다(tech-decisions §4 QueryClient 기본 옵션).
 * 파싱 실패(`PARSE_ERROR`)는 다시 불러도 같으니 재시도하지 않는다.
 */
function shouldRetry(failureCount: number, error: unknown) {
  if (failureCount >= 1) return false;
  // 네트워크·타임아웃은 http.ts가 ApiError(0, 'NETWORK' | 'TIMEOUT')로 바꿔 던진다
  if (error instanceof ApiError) {
    return (error.status >= 500 || error.status === 0) && error.code !== 'PARSE_ERROR';
  }
  return false;
}

// ─── 전역 에러 처리 ──────────────────────────────────────────

const logFields = (e: unknown) =>
  isApiError(e)
    ? { status: e.status, code: e.code, route: e.route }
    : { name: e instanceof Error ? e.name : typeof e };

/**
 * 조회 실패: 배경 재조회 실패(`data`가 이미 있음)만 토스트. 첫 로딩 실패는 화면 상태(`{status, retry}`)·`<AsyncBoundary>`·공용 404 화면,
 * 무한 목록 다음 페이지 실패는 목록 하단 재시도가 맡는다(patterns §4-5, §12). 세션 상실은 띄우지 않는다.
 * `meta.silent`인 조회(벨처럼 사용자가 할 일이 없는 배경 조회)도 띄우지 않는다.
 */
export function shouldToastQueryError(
  error: unknown,
  state: { data: unknown; fetchMeta: unknown },
  meta?: Record<string, unknown>,
): boolean {
  if (isSessionLost(error)) return false;
  if (meta?.silent === true) return false;
  if (state.data === undefined) return false;
  const fetchMore = (state.fetchMeta as { fetchMore?: unknown } | null)?.fetchMore;
  return fetchMore === undefined;
}

function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (isSessionLost(error)) return;
        log('warn', 'query.failed', logFields(error));
        if (!shouldToastQueryError(error, query.state, query.meta)) return;
        // 같은 쿼리가 한꺼번에 실패해도 하나만 뜨게 queryKey 해시를 id로
        notifyError(errorMessageOf(error), `query:${query.queryHash}`);
      },
    }),
    // 변경 실패는 로그만 남긴다. 화면 반응(토스트·안내·이동)은 호출 쪽이 `settle` + `handleError`로 한다(tech-decisions §4)
    mutationCache: new MutationCache({
      onError: (error) => {
        if (isSessionLost(error)) return;
        log('warn', 'mutation.failed', logFields(error));
      },
    }),
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
