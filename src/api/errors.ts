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
