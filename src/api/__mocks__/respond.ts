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
 * `httpStatus`는 본문 `status`와 HTTP 상태가 다른 응답을 흉내 낼 때만 쓴다. 지금 백엔드(@432cce4)에는 그런 401이 없다
 * (토큰 없음은 #808부터 HTTP 401 + 본문 401 `AUTH_401_2` — 그 전엔 본문 403 `AUTH_403_2`).
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

/** `badRequest` 기본 `reason`(필드를 따로 주지 않을 때) */
const INVALID_FIELDS = { request: '올바르지 않은 값입니다' };

/** 자주 쓰는 에러 */
export const errors = {
  /**
   * 형식·길이 검증 실패(본문 `@Valid`·파라미터 제약). 백엔드는 HTTP 400 `BAD_REQUEST`, `reason`은 필드→메시지 JSON 문자열이다
   * (`GlobalExceptionHandler` @432cce4 — `GLOBAL_400_1`은 정의만 있고 나지 않는다). 필드를 모르면 기본값
   */
  badRequest: (request: Request, fields: Record<string, string> = INVALID_FIELDS) =>
    fail(request, 400, 'BAD_REQUEST', JSON.stringify(fields)),
  /** 경로 id 타입 오류(Spring TypeMismatch) — 로그인 상태면 HTTP 400 `BAD_REQUEST`, `reason` "Bad Request"(B7) */
  typeMismatch: (request: Request) => fail(request, 400, 'BAD_REQUEST', 'Bad Request'),
  /** 토큰 없음(쿠키 만료 포함)·정지·탈퇴 계정(익명 처리). HTTP 401 + 본문 401 `AUTH_401_2`(#808, `TokenAuthenticationEntryPoint` @432cce4) */
  noToken: (request: Request) =>
    fail(request, 401, 'AUTH_401_2', '알맞은 accessToken을 넣어주세요.'),
  /** 만료된 액세스 토큰(보호 경로만, #792). 재발급 대상. 쿠키는 지우지 않는다 */
  expiredToken: (request: Request) =>
    fail(request, 401, 'AUTH_401_1', '인증 토큰이 만료되었습니다.'),
  /**
   * 위조·형식 오류 액세스 토큰(보호 경로만, #792). 토큰이 쿠키로 왔으면 `accessToken` 삭제 `Set-Cookie`를 붙인다
   * (`TokenAuthenticationEntryPoint` @432cce4 — mock은 쿠키로만 토큰을 받으므로 언제나 붙인다)
   */
  invalidToken: (request: Request) => {
    const res = fail(request, 401, 'GLOBAL_401_1', '잘못된 토큰입니다. 재 로그인 해주세요');
    res.headers.append('set-cookie', 'accessToken=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
    return res;
  },
  /**
   * 재발급 실패(리프레시 토큰 없음·만료·서명·형식 오류·서버에 없음 — 세션 상한을 넘어 밀려난 세션, 유예 30초가 지난 옛 토큰 재사용).
   * 기기별 세션이라 "다른 기기에서 덮어씀"은 없다(#807). 백엔드는 쿠키를 지우지 않는다
   */
  refreshRejected: (request: Request) =>
    fail(request, 403, 'AUTH_403_1', '리프레시 토큰이 유효하지 않습니다.'),
  serverError: (request: Request) =>
    fail(request, 500, 'GLOBAL_500_1', '서버 오류. 관리자에게 문의 부탁드립니다.'),
  /**
   * 필수 동의·확인 누락(`AgreementRequiredException`, #840). 백엔드 `agreement.enforce=true`일 때만 난다(지금 기본 false).
   * 기본 핸들러는 강제하지 않고, 이름 붙인 세트(`authHandlers.registerAgreementEnforced`·`orderHandlers.agreementEnforced`)만 낸다
   */
  agreementRequired: (request: Request) =>
    fail(request, 400, 'Agreement_400_1', '필수 동의 또는 확인이 필요합니다.'),
  /** OAuth `state` 파라미터와 쿠키가 다름 */
  stateMismatch: (request: Request) =>
    fail(
      request,
      400,
      'AUTH_400_1',
      '로그인 요청이 만료되었거나 올바르지 않습니다. 다시 로그인해 주세요.',
    ),
  /** 정지 계정의 로그인·재발급(`User.login()`) */
  suspended: (request: Request) => fail(request, 403, 'USER_403_1', '접근이 제한된 유저입니다.'),
  userNotFound: (request: Request) =>
    fail(request, 404, 'USER_404_1', '유저 정보를 찾을 수 없습니다.'),
  alreadyRegistered: (request: Request) =>
    fail(request, 400, 'USER_400_1', '이미 회원가입한 유저입니다.'),
  /** 카카오 인가 코드 재사용·만료(백엔드 `KakaoKauthErrorCode.KOE320`) */
  kakaoCodeInvalid: (request: Request) =>
    fail(
      request,
      400,
      'KAKAO_KOE320',
      '동일한 인가 코드를 두 번 이상 사용하거나, 이미 만료된 인가 코드를 사용한 경우, 혹은 인가 코드를 찾을 수 없는 경우',
    ),
  /** 카카오 id 토큰 형식 오류(`KOE400`) */
  kakaoIdTokenInvalid: (request: Request) =>
    fail(
      request,
      400,
      'KAKAO_KOE400',
      'ID 토큰 값이 전달되지 않았거나 올바른 형식이 아닌 ID 토큰인 경우',
    ),
  /** 카카오 사용자 정보 조회가 401(잘못된 카카오 액세스 토큰). 백엔드 `KakaoInfoErrorDecoder`는 HTTP 400으로 바꾼다 */
  kakaoAccessTokenInvalid: (request: Request) =>
    fail(request, 400, 'FEIGN_400_2', 'Other server unauthorized'),
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
 * 요청이 로그인 사용자로 인증되는지(유효한 액세스 토큰 쿠키). 핸들러의 `cookies`(MSW가 `Cookie` 헤더와, jsdom이면
 * `credentials` 모드에 따라 `document.cookie`까지 모은 값)를 넘긴다. 공개 GET은 `credentials: 'omit'`라 언제나 false다.
 * 만료·위조 토큰은 공개 경로에서 익명으로 처리된다(#792) — false.
 */
export const hasAccessToken = (cookies: Record<string, string>) => authState(cookies) === 'valid';

/**
 * mock 세션 상태(plan P4a)를 쿠키 값으로 만든다. 백엔드처럼 액세스·리프레시 토큰 쿠키만 본다.
 * - 로그인: `accessToken=<아무 값>` — `/api/__mock/login`, e2e `setMockSession(page, 'loggedIn')`
 * - 비로그인: 쿠키 없음 → 보호 요청 401 `AUTH_401_2`
 * - 만료: `accessToken=expired` → 보호 요청 401 `AUTH_401_1`. 재발급은 `refreshToken` 쿠키가
 *   `MOCK_REFRESH_TOKEN`이면 성공(새 액세스 쿠키), 그 밖(없음·`revoked`)이면 403 `AUTH_403_1`
 * - 위조: `accessToken=forged`(서명 키가 다른 쿠키 — 로컬 dev ↔ staging 전환, 운영 키 교체) → 보호 요청 401
 *   `GLOBAL_401_1` + `accessToken` 삭제 `Set-Cookie`
 *
 * 만료·위조 토큰은 **보호 경로에서만** 401이다. 공개 GET·재발급·OAuth·로그아웃은 익명으로 통과한다(#792·#793,
 * `JwtTokenFilter` @432cce4) — 그 핸들러들은 액세스 쿠키를 보지 않거나 `hasAccessToken`으로 익명 값을 준다.
 */
export const EXPIRED_ACCESS_TOKEN = 'expired';
export const FORGED_ACCESS_TOKEN = 'forged';
export const MOCK_ACCESS_TOKEN = 'mock';
export const MOCK_REFRESH_TOKEN = 'mock-refresh';

export type MockAuthState = 'valid' | 'expired' | 'invalid' | 'none';
export function authState(cookies: Record<string, string>): MockAuthState {
  if (!cookies.accessToken) return 'none';
  if (cookies.accessToken === EXPIRED_ACCESS_TOKEN) return 'expired';
  if (cookies.accessToken === FORGED_ACCESS_TOKEN) return 'invalid';
  return 'valid';
}

/** 보호 API 앞단(`TokenAuthenticationEntryPoint`). 통과하면 null, 아니면 백엔드와 같은 401 응답 */
export function requireAuth(request: Request, cookies: Record<string, string>) {
  switch (authState(cookies)) {
    case 'valid':
      return null;
    case 'expired':
      return errors.expiredToken(request);
    case 'invalid':
      return errors.invalidToken(request);
    case 'none':
      return errors.noToken(request);
  }
}

/**
 * 공개 GET(GE-5·GH-3·GH-14 등)의 숫자가 아닌 경로 id. `V2_PUBLIC_GET_PATHS`는 숫자 id만 공개로 보므로 보호 경로처럼 인증부터
 * 본다 — 비로그인 401 `AUTH_401_2`(만료·위조면 그 401), 로그인이면 400 `BAD_REQUEST`(B7, @432cce4)
 */
export const publicIdMismatch = (request: Request, cookies: Record<string, string>) =>
  requireAuth(request, cookies) ?? errors.typeMismatch(request);

/** 경로의 숫자 id. 숫자가 아니면 null(보호 경로는 `errors.typeMismatch`, 공개 GET은 `publicIdMismatch`) */
export function readId(value: unknown) {
  const n = Number(value);
  return typeof value === 'string' && /^\d+$/.test(value) && Number.isSafeInteger(n) ? n : null;
}
