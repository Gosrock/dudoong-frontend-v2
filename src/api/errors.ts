/** 백엔드 에러. `status`는 언제나 HTTP 상태다(본문 `status`와 다를 수 있다 — api-contract §1). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly reason: string,
  ) {
    super(`${status} ${code}${reason ? ` ${reason}` : ''}`);
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
