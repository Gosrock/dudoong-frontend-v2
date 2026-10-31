import { z } from 'zod';

import { authApi } from '../http';
import {
  CanRegisterSchema,
  KakaoLoginLinkSchema,
  KakaoProfileSchema,
  KakaoTokensSchema,
  type RegisterBody,
  TokenAndUserSchema,
} from './schema';

/**
 * v1 인증 호출(api-contract §9). 경로는 `/api/v1/auth` 아래, `authApi`라 401 가로채기가 없다.
 * 모두 쿠키를 싣는다(`credentials: 'include'`) — 1·3번은 `oauth_state` 쿠키를, 재발급은 리프레시 쿠키를 주고받는다.
 * 토큰은 쿼리스트링이 아니라 본문으로 보낸다(쿼리스트링은 백엔드 전환 기간용).
 * 결과 판정(재발급의 성공·상실·일시 오류, 콜백의 정지·state 불일치·401)은 부르는 쪽이 한다.
 */

/** 1 카카오 인증 화면 주소. 백엔드가 `Referer`로 `redirect_uri`(`{출처}/kakao/callback`)를 고르고 `state`를 붙인다 */
export const getKakaoLoginLink = async () =>
  (await authApi.get('oauth/kakao/link', KakaoLoginLinkSchema)).link;

/** 3 카카오 인가 코드 → 카카오 토큰. `state`는 콜백 주소의 값을 그대로 넘긴다(쿠키와 다르면 400 `AUTH_400_1`) */
export const exchangeKakaoCode = ({ code, state }: { code: string; state: string | null }) =>
  authApi.get('oauth/kakao', KakaoTokensSchema, {
    searchParams: state === null ? { code } : { code, state },
  });

/** 4 신규 사용자인지(true = 가입 흐름) */
export const checkCanRegister = async (idToken: string) =>
  (await authApi.post('oauth/kakao/register/valid', CanRegisterSchema, { idToken })).canRegister;

/** 5a 기존 사용자 로그인. 성공하면 응답 `Set-Cookie`로 두둥 토큰 2개. 정지 계정은 403 `USER_403_1` */
export const loginWithKakao = (idToken: string) =>
  authApi.post('oauth/kakao/login', TokenAndUserSchema, { idToken });

/** 5b 가입 폼을 채울 카카오 프로필 */
export const getKakaoProfile = (kakaoAccessToken: string) =>
  authApi.post('oauth/kakao/info', KakaoProfileSchema, { accessToken: kakaoAccessToken });

/** 5b 회원가입. 성공하면 로그인과 같다(`Set-Cookie`). 이미 가입한 사람이면 400 `USER_400_1` */
export const registerWithKakao = (body: RegisterBody) =>
  authApi.post('oauth/kakao/register', TokenAndUserSchema, body);

/** `POST /token/refresh` — 본문 없이 리프레시 쿠키로. 타임아웃은 요청 기본값 10초. 판정은 `auth-handlers.ts` */
export const refreshTokens = () => authApi.post('token/refresh', z.unknown());

/** `POST /logout` — 쿠키 삭제. 결과와 상관없이 호출한 쪽이 로컬을 정리한다 */
export const requestLogout = () => authApi.post('logout', z.unknown());
