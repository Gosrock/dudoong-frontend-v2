import { HttpResponse } from 'msw';

import type { Page } from '../shared/page';

/** mock 이미지 출처. 실제 파일은 없다(브라우저에서는 깨진 이미지로 보인다) */
export const MOCK_IMAGE_ORIGIN = 'https://image.mock.dudoong.test';

/** 백엔드 `timeStamp` 모양(LocalDateTime, 나노초). 값은 고정 */
const TIME_STAMP = '2026-10-17T20:00:00.000000000';

/** 성공 래퍼 `{success, status, data, timeStamp}`(api-contract §1). 성공은 언제나 HTTP 200 */
export const ok = <T>(data: T) =>
  HttpResponse.json({ status: 200, data, success: true, timeStamp: TIME_STAMP });

/**
 * 에러 래퍼 `{success:false, status, code, reason, timeStamp, path}`(운영 404 응답과 같은 모양).
 * `httpStatus`를 따로 받는 것은 본문 `status`와 HTTP 상태가 다른 응답이 있어서다(토큰 없음 = HTTP 401 + 본문 403 `AUTH_403_2`).
 */
export function fail(
  request: Request,
  status: number,
  code: string,
  reason: string,
  httpStatus: number = status,
) {
  return HttpResponse.json(
    { success: false, status, code, reason, timeStamp: TIME_STAMP, path: request.url },
    { status: httpStatus },
  );
}

/** 자주 쓰는 에러 */
export const errors = {
  /** 형식·길이 검증 실패 */
  badRequest: (request: Request) => fail(request, 400, 'GLOBAL_400_1', '검증 오류'),
  /** 토큰 없음(쿠키 만료 포함). HTTP 401인데 본문 status는 403 */
  noToken: (request: Request) =>
    fail(request, 403, 'AUTH_403_2', '알맞은 accessToken을 넣어주세요.', 401),
  /** 만료된 액세스 토큰(JWT 필터). 재발급 대상 */
  expiredToken: (request: Request) =>
    fail(request, 401, 'AUTH_401_1', '인증 토큰이 만료되었습니다.'),
  /** 재발급 실패(리프레시 토큰 없음·만료·다른 기기에서 덮어씀). 백엔드는 쿠키를 지우지 않는다 */
  refreshRejected: (request: Request) =>
    fail(request, 403, 'AUTH_403_1', '리프레시 토큰이 유효하지 않습니다.'),
  serverError: (request: Request) =>
    fail(request, 500, 'GLOBAL_500_1', '서버 오류. 관리자에게 문의 부탁드립니다.'),
};

/** 배열을 `V2PageResponse`로 자른다. `slice`면 Slice 응답(totalElements·totalPages null, GN-1) */
export function paginate<T>(items: T[], page: number, size: number, slice = false): Page<T> {
  const content = items.slice(page * size, page * size + size);
  const hasNext = (page + 1) * size < items.length;
  return {
    content,
    page,
    size,
    totalElements: slice ? null : items.length,
    totalPages: slice ? null : Math.ceil(items.length / size),
    hasNext,
  };
}

/**
 * 페이지 파라미터를 백엔드처럼 읽는다(`page` ≥ 0, 1 ≤ `size` ≤ 상한). 틀리면 `null` → 400.
 * 기본 크기: 카드형 목록 10, 그 밖 20(api-contract §1).
 */
export function readPageParams(url: URL, defaultSize: number, maxSize = 50) {
  const page = Number(url.searchParams.get('page') ?? 0);
  const size = Number(url.searchParams.get('size') ?? defaultSize);
  if (!Number.isInteger(page) || page < 0) return null;
  if (!Number.isInteger(size) || size < 1 || size > maxSize) return null;
  return { page, size };
}

/**
 * 요청에 액세스 토큰 쿠키가 실렸는지. 핸들러의 `cookies`(MSW가 `Cookie` 헤더와, jsdom이면 `credentials` 모드에 따라
 * `document.cookie`까지 모은 값)를 넘긴다. 공개 GET은 `credentials: 'omit'`라 언제나 false다.
 */
export const hasAccessToken = (cookies: Record<string, string>) =>
  Boolean(cookies.accessToken) && cookies.accessToken !== EXPIRED_ACCESS_TOKEN;

/**
 * mock 세션 3상태(plan P4a)를 쿠키 값으로 만든다. 백엔드처럼 액세스·리프레시 토큰 쿠키만 본다.
 * - 로그인: `accessToken=<아무 값>` — `/api/__mock/login`, e2e `setMockSession(page, 'loggedIn')`
 * - 비로그인: 쿠키 없음
 * - 만료: `accessToken=expired` → 보호 요청 401 `AUTH_401_1`. 재발급은 `refreshToken` 쿠키가
 *   `MOCK_REFRESH_TOKEN`이면 성공(새 액세스 쿠키), 그 밖(없음·`revoked`)이면 403 `AUTH_403_1`
 */
export const EXPIRED_ACCESS_TOKEN = 'expired';
export const MOCK_ACCESS_TOKEN = 'mock';
export const MOCK_REFRESH_TOKEN = 'mock-refresh';

export type MockAuthState = 'valid' | 'expired' | 'none';
export function authState(cookies: Record<string, string>): MockAuthState {
  if (!cookies.accessToken) return 'none';
  return cookies.accessToken === EXPIRED_ACCESS_TOKEN ? 'expired' : 'valid';
}

/** 보호 API 앞단(JWT 필터 + 인가). 통과하면 null, 아니면 백엔드와 같은 401 응답 */
export function requireAuth(request: Request, cookies: Record<string, string>) {
  const state = authState(cookies);
  if (state === 'valid') return null;
  return state === 'expired' ? errors.expiredToken(request) : errors.noToken(request);
}

/** 경로의 숫자 id. 숫자가 아니면 null(백엔드는 타입 변환 실패로 400) */
export function readId(value: unknown) {
  const n = Number(value);
  return typeof value === 'string' && /^\d+$/.test(value) && Number.isSafeInteger(n) ? n : null;
}
