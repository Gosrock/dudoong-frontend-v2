import { isServer, MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { log } from '@/utils/log';

import { ApiError, isApiError, isSessionLost } from './errors';
import { isHandledByScreen } from './handle-codes';

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

// ─── 전역 에러 토스트 ────────────────────────────────────────

/** `reason`이 비었을 때(네트워크·타임아웃·파싱 실패·HTML 502) 띄우는 고정 문구 */
export const FALLBACK_ERROR_MESSAGE = '일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.';

export type ErrorNotifier = (message: string, id: string) => void;

/**
 * `src/api`는 `src/ui`를 import할 수 없어(계층 규칙) 토스트를 주입받는다. 등록은 앱 셸(`providers.tsx`)이
 * `setErrorNotifier((message, id) => toast(message, { id }))`로 한 번 한다. 등록 전에는 로그만 남긴다.
 */
let notify: ErrorNotifier | null = null;
export function setErrorNotifier(fn: ErrorNotifier | null) {
  notify = fn;
}

const messageOf = (e: unknown) => (isApiError(e) && e.reason) || FALLBACK_ERROR_MESSAGE;
const logFields = (e: unknown) =>
  isApiError(e)
    ? { status: e.status, code: e.code, route: e.route }
    : { name: e instanceof Error ? e.name : typeof e };

/**
 * 조회 실패: 배경 재조회 실패(`data`가 이미 있음)만 토스트. 첫 로딩 실패는 `<AsyncBoundary>`·공용 404 화면,
 * 무한 목록 다음 페이지 실패는 목록 하단 재시도가 맡는다(patterns §4-5, §12). 세션 상실은 띄우지 않는다.
 */
export function shouldToastQueryError(
  error: unknown,
  state: { data: unknown; fetchMeta: unknown },
): boolean {
  if (isSessionLost(error)) return false;
  if (state.data === undefined) return false;
  const fetchMore = (state.fetchMeta as { fetchMore?: unknown } | null)?.fetchMore;
  return fetchMore === undefined;
}

/** 변경 실패: `handleCodes`로 화면이 맡은 코드(`meta.handledCodes`)·`meta.handled`·세션 상실이 아니면 토스트. */
export function shouldToastMutationError(
  error: unknown,
  meta: Record<string, unknown> | undefined,
): boolean {
  if (isSessionLost(error)) return false;
  return !isHandledByScreen(meta, error);
}

function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (isSessionLost(error)) return;
        log('warn', 'query.failed', logFields(error));
        if (!shouldToastQueryError(error, query.state)) return;
        // 같은 쿼리가 한꺼번에 실패해도 하나만 뜨게 queryKey 해시를 id로
        notify?.(messageOf(error), `query:${query.queryHash}`);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (isSessionLost(error)) return;
        log('warn', 'mutation.failed', logFields(error));
        if (!shouldToastMutationError(error, mutation.meta)) return;
        notify?.(messageOf(error), `mutation:${isApiError(error) ? error.code : 'UNKNOWN'}`);
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
