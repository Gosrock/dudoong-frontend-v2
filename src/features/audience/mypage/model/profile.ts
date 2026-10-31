import { NICKNAME_MAX, NICKNAME_MIN, NOT_BLANK } from '@/api/me/schema';
import { UPLOAD_INVALID_EXTENSION, UPLOAD_PUT_FAILED } from '@/api/upload';

/**
 * 프로필 편집 규칙(GM-1 · PM-2 · PM-3, plan P9). 닉네임은 2~7자(v1 `ChangeNameRequest`와 같다). 앞뒤 공백은 지우고 보낸다 —
 * 서버는 공백만인 닉네임을 `@Pattern`(Java 공백 기준 `\p{javaWhitespace}`, #884)으로 먼저 막아 400 `BAD_REQUEST`를 준다. 도메인
 * `USER_400_4`(Kotlin `isBlank`)는 그 뒤라 줄바꿈 금지 공백(U+00A0 등)만인 값에만 온다(fe423ed4 `V2UserDomainService`).
 * 화면은 `trim()`(줄바꿈 금지 공백도 지운다) + 같은 판정(`NOT_BLANK`)으로 둘 다 미리 막는다.
 */
export function nicknameError(raw: string): string | null {
  const name = raw.trim();
  if (!name || !NOT_BLANK.test(name)) return '닉네임을 입력해 주세요';
  if (name.length < NICKNAME_MIN || name.length > NICKNAME_MAX) {
    return `닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해 주세요`;
  }
  return null;
}

/** 화면이 처리하는 프로필 코드(patterns §24 P9). 업로드 실패 둘은 `src/api/upload.ts`가 만드는 코드 */
export const PROFILE_ERROR_MESSAGE = {
  /** 닉네임 공백만 — 칸 오류. 400 `BAD_REQUEST`(PM-2 본문 검증 — 이름만 보낼 때)도 같은 칸 오류로 본다 */
  USER_400_4: '닉네임은 공백만으로 지을 수 없어요',
  /** 본인에게 발급한 이미지 key가 아님 — PM-3 발급부터 다시(`retry`) */
  USER_400_5: '이미지를 다시 올려 주세요',
  [UPLOAD_INVALID_EXTENSION]: 'JPG·PNG 이미지만 올릴 수 있어요',
  [UPLOAD_PUT_FAILED]: '이미지를 올리지 못했어요. 다시 시도해 주세요',
} as const;

// ─── 마케팅 수신 설정(legal-copy B-6·B-7, v1-additions E-1) ───

/** 처리 일자(KST `YYYY.MM.DD`) — 정보통신망법 제50조⑧ 처리 결과 통지의 "일자" */
export function kstDate(at: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}.${part('month')}.${part('day')}`;
}

/** 바꾼 뒤 처리 결과 통지(legal-copy B-7 — v1 운영 문구: 전송자·일자·처리 내용) */
export const marketingResultMessage = (agree: boolean, at: Date) =>
  `${agree ? '마케팅 정보 수신에 동의했어요' : '마케팅 정보 수신을 거부했어요'} (${kstDate(at)}, 두둥)`;

/** 바꾸지 못했을 때(legal-copy B-7). 값은 서버 값 그대로 남는다 */
export const MARKETING_ERROR_MESSAGE = '설정을 바꾸지 못했어요. 잠시 후 다시 시도해주세요.';
