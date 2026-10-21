import { describe, expect, it } from 'vitest';

import { kakaoProfiles, kakaoTokens } from '../__mocks__/fixtures/kakao';
import {
  CanRegisterSchema,
  KakaoLoginLinkSchema,
  KakaoProfileSchema,
  KakaoTokensSchema,
} from './schema';

/**
 * v1 인증 응답 스키마. 근거는 백엔드 DTO(dev 24aa595 — `OauthLoginLinkResponse`, `OauthTokenResponse`,
 * `AvailableRegisterResponse`, `OauthUserInfoResponse`)와 e2e `test_60_763_token_cookie_cors.py`의 링크 모양.
 */
describe('v1 인증 응답 스키마', () => {
  it('링크 — 카카오 인증 주소(state 포함)', () => {
    const link =
      'https://kauth.kakao.com/oauth/authorize?client_id=abc&redirect_uri=http://localhost:3000/kakao/callback&response_type=code&state=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    expect(KakaoLoginLinkSchema.parse({ link })).toEqual({ link });
  });

  it('카카오 토큰 — mock fixture와 null(Kotlin nullable)을 받는다', () => {
    expect(KakaoTokensSchema.parse(kakaoTokens('existing')).idToken).toBe('kakao-id-existing');
    expect(
      KakaoTokensSchema.parse({ accessToken: 'a', refreshToken: null, idToken: null }),
    ).toEqual({ accessToken: 'a', refreshToken: null, idToken: null });
  });

  it('신규 판정', () => {
    expect(CanRegisterSchema.parse({ canRegister: true })).toEqual({ canRegister: true });
    expect(CanRegisterSchema.safeParse({}).success).toBe(false);
  });

  it.each(Object.entries(kakaoProfiles))('카카오 프로필 fixture(%s)', (_, profile) => {
    expect(KakaoProfileSchema.parse(profile)).toEqual(profile);
  });
});
