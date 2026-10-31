import type { KakaoProfile } from '../../auth/schema';

/**
 * 카카오 로그인 mock 사용자(api-contract §9). 인가 코드 `mock-<who>` → 카카오 토큰 `kakao-*-<who>`.
 * - `existing` — 가입한 사용자(`canRegister=false` → 로그인)
 * - `new` — 처음 온 사람(탈퇴한 사람도 같다 — 탈퇴 때 oid가 바뀌어 기존 사용자로 잡히지 않는다)
 * - `suspended` — 정지 계정(로그인 403 `USER_403_1`)
 * - `noEmail` — 처음 온 사람인데 카카오 이메일 동의를 하지 않음(가입 폼에서 직접 적는다)
 */
export const KAKAO_USERS = ['existing', 'new', 'suspended', 'noEmail'] as const;
export type KakaoUser = (typeof KAKAO_USERS)[number];

export const kakaoCode = (who: KakaoUser) => `mock-${who}`;
export const kakaoIdToken = (who: KakaoUser) => `kakao-id-${who}`;
export const kakaoAccessToken = (who: KakaoUser) => `kakao-access-${who}`;

/** 토큰·코드 → 사용자. 모르는 값이면 null */
export function kakaoUserOf(value: string | null | undefined, prefix: string): KakaoUser | null {
  if (!value?.startsWith(prefix)) return null;
  const who = value.slice(prefix.length);
  return (KAKAO_USERS as readonly string[]).includes(who) ? (who as KakaoUser) : null;
}

/** 3 `GET /oauth/kakao` 응답 */
export const kakaoTokens = (who: KakaoUser) => ({
  accessToken: kakaoAccessToken(who),
  refreshToken: `kakao-refresh-${who}`,
  idToken: kakaoIdToken(who),
});

/** 가입한(또는 정지된) 사용자 — 4번에서 `canRegister=false` */
export const isRegistered = (who: KakaoUser) => who === 'existing' || who === 'suspended';

/**
 * 5b `POST /oauth/kakao/info` 응답. 카카오 전화번호는 `+82 10-…` 꼴이다. `name`은 카카오 닉네임이다 — 콘솔에서 이름 항목을 쓰지 않아
 * (B8) 서버가 `kakao_account.name ?: properties.nickname`으로 채운다. 이메일은 카카오 계정에 없으면 빈다(`noEmail`)
 */
export const kakaoProfiles: Record<KakaoUser, KakaoProfile> = {
  existing: {
    email: 'dudoong@example.com',
    phoneNumber: '+82 10-1234-5678',
    profileImage: 'http://k.kakaocdn.net/dn/mock/existing.jpg',
    name: '두둥이',
  },
  new: {
    email: 'newbie@example.com',
    phoneNumber: '+82 10-9876-5432',
    profileImage: 'http://k.kakaocdn.net/dn/mock/new.jpg',
    name: '새내기',
  },
  suspended: {
    email: 'blocked@example.com',
    phoneNumber: null,
    profileImage: null,
    name: '정지된사람',
  },
  noEmail: { email: null, phoneNumber: null, profileImage: null, name: '이메일없음' },
};
