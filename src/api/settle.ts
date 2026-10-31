import { errorMessageOf, notifyError } from './error-toast';
import { type ApiError, getErrorCode, isApiError, isSessionLost } from './errors';

/** `settle`의 결과. 실패해도 throw하지 않고 `{ ok: false, error }`로 돌려준다 */
export type Settled<T> = { ok: true; data: T } | { ok: false; error: unknown };

/**
 * 변경 요청(`mutation.mutateAsync(...)`)을 결과값으로 받는다 — **절대 throw하지 않는다**(tech-decisions §4, patterns §4-5).
 * `mutateAsync`를 `try/catch` 없이 써서 처리되지 않은 rejection이 나는 일을 막는다. eslint가 `settle` 밖의 `mutateAsync`를 막는다.
 *
 * ```ts
 * const r = await settle(mutation.mutateAsync(body));
 * if (!r.ok) return handleError(r.error, { Order_400_22: () => setFormError('…') });
 * router.replace(`/orders/${r.data.orderUuid}`);
 * ```
 */
export function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  return promise.then(
    (data): Settled<T> => ({ ok: true, data }),
    (error: unknown): Settled<T> => ({ ok: false, error }),
  );
}

/** 코드 → 화면 처리. 키는 백엔드 에러 코드(`Order_400_22`, `BAD_REQUEST` …) */
export type ErrorCodeHandlers = Readonly<Record<string, (error: ApiError) => void>>;

export type HandleErrorOptions = {
  /**
   * 표에 없는 에러를 공용 토스트 대신 화면이 맡을 때(예: 무료 선착순 확정 실패 → 폼 상단 "다시 시도",
   * 셀프 체크인 → 결과 화면). 세션 상실에는 부르지 않는다.
   */
  otherwise?: (error: unknown) => void;
};

/**
 * 변경 실패의 기본 처리(tech-decisions §4). 순서대로 하나만 한다.
 * 1. 세션 상실(`SessionLostError`) — 아무것도 하지 않는다(인증 처리가 로그인으로 보낸다)
 * 2. `handlers`에 코드가 있으면 그 처리
 * 3. `otherwise`가 있으면 그 처리
 * 4. 공용 토스트 — `reason`(없으면 고정 문구, 검증 실패 `BAD_REQUEST`는 `VALIDATION_ERROR_MESSAGE`). id는 `mutation:<코드>`
 *
 * 로그는 전역 `MutationCache.onError`가 모든 변경 실패에 남기므로 여기서 다시 남기지 않는다.
 */
export function handleError(
  error: unknown,
  handlers: ErrorCodeHandlers = {},
  options: HandleErrorOptions = {},
): void {
  if (isSessionLost(error)) return;
  const code = getErrorCode(error);
  if (code !== null && isApiError(error) && Object.hasOwn(handlers, code)) {
    handlers[code]!(error);
    return;
  }
  if (options.otherwise) {
    options.otherwise(error);
    return;
  }
  notifyError(errorMessageOf(error), `mutation:${code ?? 'UNKNOWN'}`);
}
