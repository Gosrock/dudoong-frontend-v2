import { z } from 'zod';

/**
 * v1 인증 응답(api-contract §9). 기준: 백엔드 `api/auth/model/dto`(dev 24aa595) — Kotlin nullable은 `.nullable()`.
 * 두둥 토큰은 응답 `Set-Cookie`로 오고 FE는 본문의 토큰을 쓰지 않는다(tech-decisions §4).
 */

/** 1 `GET /oauth/kakao/link` — `OauthLoginLinkResponse`. 같은 응답에 `oauth_state` 쿠키(HttpOnly, 600초) */
export const KakaoLoginLinkSchema = z.object({ link: z.string() });

/** 3 `GET /oauth/kakao` — `OauthTokenResponse`. **카카오의** 토큰이다. 가입 흐름 동안 메모리에만 둔다 */
export const KakaoTokensSchema = z.object({
  accessToken: z.string().nullable(),
  refreshToken: z.string().nullable(),
  idToken: z.string().nullable(),
});
export type KakaoTokens = z.infer<typeof KakaoTokensSchema>;

/** 4 `POST /oauth/kakao/register/valid` — `AvailableRegisterResponse`. true = 신규(탈퇴한 사람 포함) */
export const CanRegisterSchema = z.object({ canRegister: z.boolean() });

/** 5b `POST /oauth/kakao/info` — `OauthUserInfoResponse`. 카카오 동의 항목에 따라 값이 없을 수 있다 */
export const KakaoProfileSchema = z.object({
  email: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  profileImage: z.string().nullable(),
  name: z.string().nullable(),
});
export type KakaoProfile = z.infer<typeof KakaoProfileSchema>;

/**
 * 5a·5b·재발급 응답 `TokenAndUserResponse`. FE는 본문을 쓰지 않는다 — 쿠키로 온다.
 * 모양을 검사하지 않는 이유: `userProfile.profileImage`(`ImageVo`) 직렬화 같은 쓰지 않는 필드가 바뀌어도
 * 쿠키는 이미 세팅됐는데 `PARSE_ERROR`로 로그인이 실패하면 안 된다.
 */
export const TokenAndUserSchema = z.unknown();

/** 5b `POST /oauth/kakao/register` 본문 `RegisterRequest`. `email`·`name`은 `@NotEmpty`(비면 400 `GLOBAL_400_1`) */
export type RegisterBody = {
  idToken: string;
  email: string;
  phoneNumber: string | null;
  /** 카카오 프로필 이미지 주소만 저장된다(형식이 다르면 백엔드가 기본 이미지로 둔다) */
  profileImage: string | null;
  name: string;
  marketingAgree: boolean;
};
