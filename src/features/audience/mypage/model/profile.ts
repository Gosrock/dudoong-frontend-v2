import { NICKNAME_MAX, NICKNAME_MIN } from '@/api/me/schema';
import { UPLOAD_INVALID_EXTENSION, UPLOAD_PUT_FAILED } from '@/api/upload';

/**
 * 프로필 편집 규칙(GM-1 · PM-2 · PM-3, plan P9). 닉네임은 2~7자(v1 `ChangeNameRequest`와 같다). 앞뒤 공백은 지우고 보낸다 —
 * 서버는 공백만인 닉네임을 400으로 막는다(`@Pattern` → 400 `BAD_REQUEST`, 도메인 `USER_400_4`).
 */
export function nicknameError(raw: string): string | null {
  const name = raw.trim();
  if (!name) return '닉네임을 입력해 주세요';
  if (name.length < NICKNAME_MIN || name.length > NICKNAME_MAX) {
    return `닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해 주세요`;
  }
  return null;
}

/** 화면이 처리하는 프로필 코드(patterns §24 P9). 업로드 실패 둘은 `src/api/upload.ts`가 만드는 코드 */
export const PROFILE_ERROR_MESSAGE = {
  /** 닉네임 공백만 — 칸 오류 */
  USER_400_4: '닉네임은 공백만으로 지을 수 없어요',
  /** 본인에게 발급한 이미지 key가 아님 — PM-3 발급부터 다시(`retry`) */
  USER_400_5: '이미지를 다시 올려 주세요',
  [UPLOAD_INVALID_EXTENSION]: 'JPG·PNG 이미지만 올릴 수 있어요',
  [UPLOAD_PUT_FAILED]: '이미지를 올리지 못했어요. 다시 시도해 주세요',
} as const;
