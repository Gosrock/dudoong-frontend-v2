import { http, HttpResponse } from 'msw';

import {
  isRegistered,
  kakaoCode,
  kakaoProfiles,
  kakaoTokens,
  type KakaoUser,
  kakaoUserOf,
} from './fixtures/kakao';
import { me } from './fixtures/me';
import { errors, MOCK_ACCESS_TOKEN, MOCK_REFRESH_TOKEN, ok } from './respond';

/**
 * v1 인증(`/api/v1/auth`, api-contract §9) — 재발급·로그아웃(P4a)과 카카오 OAuth(P4b).
 * 쿠키는 백엔드처럼 응답 `Set-Cookie`로 세팅한다(FE는 쿠키를 쓰지 않는다).
 * 재발급·OAuth·로그아웃은 `permitAll`이라 만료·위조 액세스 쿠키가 실려도 익명으로 통과한다(#792·#793) — 여기 핸들러는
 * 액세스 쿠키를 보지 않는다. 그래서 "낡은 액세스 쿠키 401" 시나리오는 두지 않는다(백엔드에 없는 응답).
 *
 * 카카오 흐름 흉내: 1번 링크가 실제 카카오가 아니라 가짜 인증 화면(`/api/__mock/kakao/authorize`)을 가리킨다. 그 화면에서
 * 사용자(기존·신규·정지·이메일 없음)나 실패(동의 취소·state 불일치)를 고르면 `redirect_uri?code=mock-<who>&state=…`로 돌아온다.
 * 인가 코드·카카오 토큰과 사용자의 대응은 `fixtures/kakao.ts`.
 */

const cookie = (name: string, value: string, maxAge: number) =>
  `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;

/** 로그인·재발급 응답 본문 `TokenAndUserResponse`. FE는 본문을 쓰지 않는다 */
const tokenAndUser = () => ({
  accessToken: MOCK_ACCESS_TOKEN,
  accessTokenAge: 3600,
  refreshToken: MOCK_REFRESH_TOKEN,
  refreshTokenAge: 3600,
  userProfile: { id: me.userId, profileImage: me.profileImageUrl, name: me.name },
});

/** 재발급 성공 응답 — 새 액세스·리프레시 쿠키 */
export function refreshed() {
  const res = ok(tokenAndUser());
  res.headers.append('set-cookie', cookie('accessToken', MOCK_ACCESS_TOKEN, 3600));
  res.headers.append('set-cookie', cookie('refreshToken', MOCK_REFRESH_TOKEN, 3600));
  return res;
}

// ─── 카카오 OAuth ───────────────────────────────────────────

/** `state` 쿠키(백엔드 `OauthStateHelper` — HttpOnly, Lax, 600초) */
const STATE_COOKIE = 'oauth_state';
const stateCookie = (value: string, maxAge: number) =>
  `${STATE_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;

/** 백엔드 `KakaoRedirectPolicy`처럼 Referer의 출처를 기준 주소로 쓴다. 없으면 요청 출처 */
function redirectBase(request: Request) {
  const referer = request.headers.get('referer');
  try {
    if (referer) return new URL(referer).origin;
  } catch {
    // 아래로
  }
  return new URL(request.url).origin;
}

/** 1 링크 — 가짜 인증 화면 주소 + `state` 쿠키 */
function kakaoLink(request: Request) {
  const base = redirectBase(request);
  const state = `mock-state-${Math.random().toString(36).slice(2, 12)}`;
  const authorize = new URL('/api/__mock/kakao/authorize', base);
  authorize.searchParams.set('client_id', 'mock');
  authorize.searchParams.set('redirect_uri', `${base}/kakao/callback`);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('state', state);
  const res = ok({ link: authorize.toString() });
  res.headers.append('set-cookie', stateCookie(state, 600));
  return res;
}

const escapeHtml = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** 가짜 카카오 인증 화면. 고르면 카카오처럼 `redirect_uri`로 돌려보낸다 */
function kakaoAuthorizePage(request: Request) {
  const url = new URL(request.url);
  const redirectUri = url.searchParams.get('redirect_uri') ?? '/kakao/callback';
  const state = url.searchParams.get('state');
  const back = (params: Record<string, string | null>) => {
    const to = new URL(redirectUri, url.origin);
    for (const [k, v] of Object.entries(params)) if (v !== null) to.searchParams.set(k, v);
    return to.toString();
  };
  const choices: [string, string][] = [
    ['기존 사용자로 로그인', back({ code: kakaoCode('existing'), state })],
    ['신규 사용자(가입)', back({ code: kakaoCode('new'), state })],
    ['신규 사용자 — 이메일 동의 안 함', back({ code: kakaoCode('noEmail'), state })],
    ['정지 계정', back({ code: kakaoCode('suspended'), state })],
    ['state 불일치', back({ code: kakaoCode('existing'), state: 'tampered-state' })],
    ['동의 취소', back({ error: 'access_denied', error_description: 'User denied access', state })],
  ];
  const items = choices
    .map(([label, href]) => `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`)
    .join('');
  return new HttpResponse(
    `<!doctype html><meta charset="utf-8"><title>가짜 카카오 로그인</title><h1>가짜 카카오 로그인</h1><ul>${items}</ul>`,
    { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}

/** 3 코드 교환. `state` 파라미터와 쿠키가 둘 다 있는데 다르면 400 `AUTH_400_1`. 쓰고 나면 쿠키를 지운다 */
function kakaoExchange(request: Request, cookies: Record<string, string>) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const saved = cookies[STATE_COOKIE];
  if (state && saved && state !== saved) return errors.stateMismatch(request);
  const who = kakaoUserOf(url.searchParams.get('code'), 'mock-');
  if (!who) return errors.kakaoCodeInvalid(request);
  const res = ok(kakaoTokens(who));
  res.headers.append('set-cookie', stateCookie('', 0));
  return res;
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const idTokenUser = (body: Record<string, unknown>): KakaoUser | null =>
  kakaoUserOf(typeof body.idToken === 'string' ? body.idToken : null, 'kakao-id-');

/** 로그인·가입 성공 — 두둥 토큰 쿠키(재발급 응답과 같다) */
const loggedIn = () => refreshed();

/** 로그아웃 — 쿠키 삭제. 백엔드 본문은 `data: null` 래퍼다 */
function loggedOut() {
  const res = ok(null);
  res.headers.append('set-cookie', cookie('accessToken', '', 0));
  res.headers.append('set-cookie', cookie('refreshToken', '', 0));
  return res;
}

export const authHandlers = {
  /** 기본: 리프레시 쿠키가 `MOCK_REFRESH_TOKEN`이면 성공, 아니면 403 `AUTH_403_1`. 로그아웃은 언제나 200 */
  byCookie: [
    http.post('*/api/v1/auth/token/refresh', ({ request, cookies }) =>
      cookies.refreshToken === MOCK_REFRESH_TOKEN ? refreshed() : errors.refreshRejected(request),
    ),
    http.post('*/api/v1/auth/logout', () => loggedOut()),
  ],
  /**
   * 기본 카카오 흐름. 사용자는 인가 코드·id 토큰으로 정한다(`fixtures/kakao.ts`).
   * 기존 → 로그인, 신규 → 가입, 정지 → 로그인 403 `USER_403_1`, 이미 가입한 사람의 가입 → 400 `USER_400_1`.
   */
  kakao: [
    http.get('*/api/v1/auth/oauth/kakao/link', ({ request }) => kakaoLink(request)),
    http.get('*/api/__mock/kakao/authorize', ({ request }) => kakaoAuthorizePage(request)),
    http.get('*/api/v1/auth/oauth/kakao', ({ request, cookies }) =>
      kakaoExchange(request, cookies),
    ),
    http.post('*/api/v1/auth/oauth/kakao/register/valid', async ({ request }) => {
      const who = idTokenUser(await readJson(request));
      if (!who) return errors.kakaoIdTokenInvalid(request);
      return ok({ canRegister: !isRegistered(who) });
    }),
    http.post('*/api/v1/auth/oauth/kakao/login', async ({ request }) => {
      const who = idTokenUser(await readJson(request));
      if (!who) return errors.kakaoIdTokenInvalid(request);
      if (who === 'suspended') return errors.suspended(request);
      if (!isRegistered(who)) return errors.userNotFound(request);
      return loggedIn();
    }),
    http.post('*/api/v1/auth/oauth/kakao/info', async ({ request }) => {
      const body = await readJson(request);
      const who = kakaoUserOf(
        typeof body.accessToken === 'string' ? body.accessToken : null,
        'kakao-access-',
      );
      if (!who) return errors.kakaoAccessTokenInvalid(request);
      return ok(kakaoProfiles[who]);
    }),
    http.post('*/api/v1/auth/oauth/kakao/register', async ({ request }) => {
      const body = await readJson(request);
      const who = idTokenUser(body);
      if (!who) return errors.kakaoIdTokenInvalid(request);
      const filled = (v: unknown) => typeof v === 'string' && v.length > 0;
      if (!filled(body.email) || !filled(body.name)) return errors.badRequest(request);
      if (isRegistered(who)) return errors.alreadyRegistered(request);
      return loggedIn();
    }),
  ],
  /** 1번 링크 발급이 5xx */
  kakaoLinkServerError: [
    http.get('*/api/v1/auth/oauth/kakao/link', ({ request }) => errors.serverError(request)),
  ],
  /** 3번 코드 교환이 400 `AUTH_400_1`(state 불일치) */
  kakaoStateMismatch: [
    http.get('*/api/v1/auth/oauth/kakao', ({ request }) => errors.stateMismatch(request)),
  ],
  /**
   * 5b 가입 — 동의 강제를 켠 백엔드(`agreement.enforce=true`). `ageOver14Confirmed`·`termsAgreed`가 `true`가 아니면
   * 400 `Agreement_400_1`(`RegisterRequest`·`AgreementService.requireAgreed` @432cce4). 통과하면 기본 가입으로 넘긴다
   */
  registerAgreementEnforced: [
    http.post('*/api/v1/auth/oauth/kakao/register', async ({ request }) => {
      const body = await readJson(request.clone());
      if (body.ageOver14Confirmed !== true || body.termsAgreed !== true) {
        return errors.agreementRequired(request);
      }
      return undefined;
    }),
  ],
  /** 5b 가입이 5xx */
  kakaoRegisterServerError: [
    http.post('*/api/v1/auth/oauth/kakao/register', ({ request }) => errors.serverError(request)),
  ],
  /** 재발급이 정지 계정 403 `USER_403_1`(정지된 사람의 토큰은 익명으로 처리되고 재발급도 거절된다) */
  refreshSuspended: [
    http.post('*/api/v1/auth/token/refresh', ({ request }) => errors.suspended(request)),
  ],
  refreshOk: [http.post('*/api/v1/auth/token/refresh', () => refreshed())],
  refreshRejected: [
    http.post('*/api/v1/auth/token/refresh', ({ request }) => errors.refreshRejected(request)),
  ],
  refreshServerError: [
    http.post('*/api/v1/auth/token/refresh', ({ request }) => errors.serverError(request)),
  ],
  logoutServerError: [
    http.post('*/api/v1/auth/logout', () => new HttpResponse('<html>502</html>', { status: 502 })),
  ],
};
