import { UPLOAD_INVALID_EXTENSION, UPLOAD_PUT_FAILED } from '@/api/upload';

/**
 * 이미지 업로드 실패 문구(코드 패턴 점검 A10, 2026-11-02 — directory-structure `features/shared/image-upload/`).
 * 코드는 `src/api/upload.ts`가 만든다. 발급의 429·네트워크 등 표에 없는 실패는 공용 토스트(handleError).
 * 관객 프로필(P9)이 먼저 쓰고, 호스팅 세 곳(호스트 이미지 · 포스터 · 섹션 이미지)은 묶음 ④에서 옮긴다.
 */
export const UPLOAD_ERROR_MESSAGE = {
  [UPLOAD_INVALID_EXTENSION]: 'JPG·PNG 이미지만 올릴 수 있어요',
  [UPLOAD_PUT_FAILED]: '이미지를 올리지 못했어요. 다시 시도해 주세요',
} as const;
