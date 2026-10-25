/**
 * 백엔드 에러. `status`는 언제나 HTTP 상태다(본문 `status`와 다를 수 있다 — api-contract §1).
 * `reason`은 서버가 보낸 사용자용 문장이다(없으면 ''). 로그용 라우트 패턴은 `route`에 따로 둔다.
 * 네트워크·타임아웃은 `status` 0, `code` 'NETWORK' | 'TIMEOUT'.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly reason: string,
    readonly route = '',
  ) {
    super(`${status} ${code}${route ? ` ${route}` : ''}`);
    this.name = 'ApiError';
  }
}

/** 세션을 잃었을 때 던진다. 전역 토스트·AsyncBoundary·게이트는 이 에러를 무시한다(tech-decisions §4). */
export class SessionLostError extends ApiError {
  constructor() {
    super(401, 'SESSION_LOST', '');
    this.name = 'SessionLostError';
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

/**
 * 화면이 분기할 에러 코드. **절대 throw하지 않는다** — `ApiError`가 아니면(그 밖의 예외·`null`·문자열) `null`.
 * 네트워크·타임아웃·파싱 실패도 `ApiError`라 `'NETWORK'`·`'TIMEOUT'`·`'PARSE_ERROR'`가 나온다(patterns §5).
 */
export function getErrorCode(e: unknown): string | null {
  try {
    return isApiError(e) ? e.code : null;
  } catch {
    // 폐기된 Proxy처럼 instanceof 자체가 던지는 값
    return null;
  }
}

/** HTTP 상태. `ApiError`가 아니면 `null`(네트워크·타임아웃은 0). 본문 `status`가 아니라 HTTP 상태다(api-contract §1). */
export function getErrorStatus(e: unknown): number | null {
  try {
    return isApiError(e) ? e.status : null;
  } catch {
    return null;
  }
}

/** 세션 상실. 토스트·에러 화면·게이트가 거른다(tech-decisions §4). */
export const isSessionLost = (e: unknown): e is SessionLostError => e instanceof SessionLostError;

/** HTTP 401. `SessionLostError`도 401이라 참이다 — 세션 상실을 따로 거를 곳은 `isSessionLost`를 먼저 본다. */
export const isUnauthorized = (e: unknown): e is ApiError => getErrorStatus(e) === 401;

/** HTTP 403. 호스트 권한 실패뿐이다(code는 `HOST_400_*` 그대로 — 상태로 분기하고 code로 사유를 구분한다, api-contract §1). */
export const isForbidden = (e: unknown): e is ApiError => getErrorStatus(e) === 403;

/** HTTP 404. 없는·남의·비공개 리소스(존재를 숨긴다). */
export const isNotFound = (e: unknown): e is ApiError => getErrorStatus(e) === 404;

/**
 * 형식·길이 검증 실패 코드. 백엔드는 Bean Validation·파라미터 제약·경로 타입 오류를 HTTP 400 `BAD_REQUEST`로 낸다
 * (`GlobalExceptionHandler` @432cce4). `GLOBAL_400_1`은 정의만 있고 나오지 않지만 백엔드 README가 이 코드라고 적고 있어
 * 바뀌어도 같은 분기를 타게 함께 받는다(error-codes, backend-questions). 이때 `reason`은 사용자용 문장이 아니다
 * (필드→메시지 JSON 문자열 또는 "Bad Request") — 화면에 그대로 보이지 않는다.
 */
export const VALIDATION_ERROR_CODES: readonly string[] = ['BAD_REQUEST', 'GLOBAL_400_1'];

/** 형식·길이 검증 실패(`VALIDATION_ERROR_CODES`). `ApiError`가 아니면 false */
export function isValidationError(e: unknown): e is ApiError {
  const code = getErrorCode(e);
  return code !== null && VALIDATION_ERROR_CODES.includes(code);
}
