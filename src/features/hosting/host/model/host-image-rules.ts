import { UPLOAD_INVALID_EXTENSION, UPLOAD_PUT_FAILED } from '@/api/upload';

import type { HostImageSlot } from './host-settings-form';

/**
 * 호스트 이미지 칸 안내 · 오류 규칙(L 변경 — GUI "이미지 업로드 안내·오류 문구" `1525:13546` · "이미지 안내 문구" `1525:13517`,
 * Design Sync #278 · #292, 2026-11-16 Ready). 원본 파일을 고른 직후(자르기 전) 검사한다.
 * Figma 안내(`1525:13546`)는 공연 포스터 · 상세 이미지 · 내 프로필도 같은 규칙이라고 하지만, 이번 작업은 호스트 설정만 바꾼다(PR 범위 밖).
 */

/** 원본 파일 상한 10MB(`1525:13546` "최대 10MB(원본 선택 기준, 자르기 전에 검사)") */
export const HOST_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

/** 칸 아래 회색 안내(`1525:13517` — 프로필 `1525:13513` · 커버 `1525:13515`, 커버는 #292로 "중요한 내용은 가운데에 두세요.") */
export const HOST_IMAGE_GUIDE: Record<HostImageSlot, string> = {
  PROFILE: 'JPG, JPEG, PNG · 최대 10MB · 정사각형 권장',
  COVER: 'JPG, JPEG, PNG · 최대 10MB · 중요한 내용은 가운데에 두세요.',
};

/**
 * 칸 아래 빨간 오류(`1525:13546` 거절 · 실패 문구, 형식 오류는 실패 화면 `1524:13380`의 글자 그대로).
 * 다시 올릴 때는 상자 안 [이미지 업로드]를 누른다 — 따로 [다시 올리기]를 두지 않는다(#278 3).
 */
export const HOST_IMAGE_ERROR = {
  format: 'JPG, JPEG, PNG 파일만 올릴 수 있어요.',
  heic: '아이폰 사진은 JPG로 바꿔서 올려 주세요.',
  tooLarge: '10MB 이하의 사진만 올릴 수 있어요.',
  failed: '이미지를 올리지 못했어요. 다시 시도해 주세요.',
  rateLimited: '잠시 후 다시 시도해 주세요.',
} as const;

/** 업로드(`uploadImage`) 실패 코드 → 칸 아래 오류. 표에 없는 실패(403 등)는 공용 토스트(handleError) */
export const HOST_IMAGE_UPLOAD_ERROR = {
  [UPLOAD_INVALID_EXTENSION]: HOST_IMAGE_ERROR.format,
  [UPLOAD_PUT_FAILED]: HOST_IMAGE_ERROR.failed,
  NETWORK: HOST_IMAGE_ERROR.failed,
  TIMEOUT: HOST_IMAGE_ERROR.failed,
  GLOBAL_429_1: HOST_IMAGE_ERROR.rateLimited,
} as const;

/** 아이폰 사진(HEIC · HEIF)인지 — MIME이 비어 있으면(일부 OS) 파일 이름으로 */
export function isHeicFile(file: Pick<File, 'type' | 'name'>): boolean {
  if (/^image\/hei[cf](-sequence)?$/i.test(file.type)) return true;
  return !file.type && /\.hei[cf]$/i.test(file.name);
}

/**
 * 고른 원본 파일의 처리 — `crop`(자르기로), `heic`(브라우저가 읽을 수 있으면 자르기에서 JPG로 바꾼다 — 못 읽으면 `heic` 오류),
 * 또는 오류 문구. 크기를 먼저 본다(10MB 넘는 HEIC도 크기 오류).
 */
export function hostImagePickOf(
  file: Pick<File, 'type' | 'name' | 'size'>,
  isAllowedExtension: boolean,
): { kind: 'crop' } | { kind: 'heic' } | { kind: 'error'; message: string } {
  if (file.size > HOST_IMAGE_MAX_BYTES)
    return { kind: 'error', message: HOST_IMAGE_ERROR.tooLarge };
  if (isAllowedExtension) return { kind: 'crop' };
  if (isHeicFile(file)) return { kind: 'heic' };
  return { kind: 'error', message: HOST_IMAGE_ERROR.format };
}
