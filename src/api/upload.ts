import { z } from 'zod';

import { ApiError } from './errors';
import { api } from './http';

/**
 * 이미지 업로드: 발급 → S3 PUT → `{ key, url }` (api-contract §1 이미지 업로드, tech-decisions — 업로드 모듈은 src/api/upload).
 * 호스트(PH-15)·공연(PE-10)·프로필(PM-3) 세 화면이 같이 쓴다. 받은 `key`는 저장 API(PH-4·PE-4·PM-2)에 그대로 보내고,
 * 공연 본문(SECTION) 이미지는 `url`을 HTML에 넣는다.
 *
 * - presigned URL은 **3분** 유효하다. 발급 직후 바로 올린다. PUT이 실패하면 발급부터 다시 한다(이 함수를 다시 부른다).
 * - 발급은 **사용자당 분당 30회**(백엔드 `PresignedUrlRateLimitAop`, 넘으면 429 `GLOBAL_429_1`). 화면에서 반복·자동 재시도하지 않는다.
 * - 확장자는 JPEG·JPG·PNG만 받는다. JPG로 보내도 key는 `.jpeg`로 발급된다.
 */

// ─── 발급 요청·응답 (백엔드 V2HostImageUploadRequest · V2EventImageUploadRequest · V2MeImageUploadRequest) ───

export type HostImagePurpose = 'PROFILE' | 'COVER';
export type EventImagePurpose = 'POSTER' | 'SECTION';
/** 백엔드 `ImageFileExtension`. JPG도 받지만 같은 `image/jpeg`라 JPEG로 보낸다. */
type ImageFileExtension = 'JPEG' | 'PNG';

export type UploadTarget =
  | { kind: 'host'; hostId: number; purpose: HostImagePurpose }
  | { kind: 'event'; eventId: number; purpose: EventImagePurpose }
  | { kind: 'profile' };

/** PH-15 · PE-10 · PM-3 응답 공통부. `purpose`(호스트·공연만)는 요청한 값 그대로라 읽지 않는다. */
export const ImageUploadUrlSchema = z.object({
  /** PUT용. 3분 유효. 서명에 `Content-Type: image/{jpeg|png}`가 묶여 있다 */
  presignedUrl: z.string(),
  key: z.string(),
  /** 백엔드 타입은 `String?`. key가 있으면 실제로는 늘 값이 있다 */
  url: z.string().nullable(),
});
export type ImageUploadUrl = z.infer<typeof ImageUploadUrlSchema>;

export type UploadedImage = { key: string; url: string | null };

// ─── 확장자 ──────────────────────────────────────────────────

const BY_MIME: Record<string, ImageFileExtension> = {
  'image/jpeg': 'JPEG',
  'image/jpg': 'JPEG',
  'image/pjpeg': 'JPEG',
  'image/png': 'PNG',
};
const BY_NAME: Record<string, ImageFileExtension> = { jpeg: 'JPEG', jpg: 'JPEG', png: 'PNG' };

/** 업로드 전 확장자 판별. MIME을 먼저 보고, 비어 있으면(일부 OS·드래그) 파일 이름의 확장자를 본다. 아니면 `null`. */
export function imageExtensionOf(file: Pick<File, 'type' | 'name'>): ImageFileExtension | null {
  if (file.type) return BY_MIME[file.type.toLowerCase()] ?? null;
  const ext = /\.([^.]+)$/.exec(file.name)?.[1]?.toLowerCase();
  return ext ? (BY_NAME[ext] ?? null) : null;
}

/** 서명된 Content-Type과 같아야 한다(백엔드 `withContentType("image/" + uploadExtension)`). */
const CONTENT_TYPE: Record<ImageFileExtension, string> = { JPEG: 'image/jpeg', PNG: 'image/png' };

export const UPLOAD_INVALID_EXTENSION = 'UPLOAD_INVALID_EXTENSION';
export const UPLOAD_PUT_FAILED = 'UPLOAD_PUT_FAILED';

/** S3 PUT 시간 제한. presigned URL 수명(3분)보다 짧게 */
const PUT_TIMEOUT_MS = 60_000;

// ─── 호출 ────────────────────────────────────────────────────

function issuePath(target: UploadTarget) {
  switch (target.kind) {
    case 'host':
      return `hosts/${target.hostId}/images`;
    case 'event':
      return `events/${target.eventId}/images`;
    case 'profile':
      return 'me/images';
  }
}

function issueBody(target: UploadTarget, extension: ImageFileExtension) {
  return target.kind === 'profile' ? { extension } : { purpose: target.purpose, extension };
}

/**
 * 이미지 하나를 올리고 `{ key, url }`을 돌려준다. 실패는 모두 `ApiError`라 `getErrorCode`·전역 토스트가 그대로 다룬다.
 * - 확장자가 JPEG·JPG·PNG가 아니면 발급 전에 `ApiError(0, 'UPLOAD_INVALID_EXTENSION')`(요청을 보내지 않는다)
 * - 발급 실패는 백엔드 에러 그대로(권한 403, 429 `GLOBAL_429_1` 등)
 * - S3 PUT이 2xx가 아니면 `ApiError(S3 상태, 'UPLOAD_PUT_FAILED')`(만료 3분이 지나면 S3가 403), 연결 실패는 `NETWORK`·`TIMEOUT`
 *
 * S3 PUT은 ky·`api`를 거치지 않는다 — 응답에 래퍼가 없고, 다른 출처라 쿠키를 실으면 안 된다(`credentials: 'omit'`).
 */
export async function uploadImage({
  target,
  file,
  signal,
}: {
  target: UploadTarget;
  file: File;
  signal?: AbortSignal;
}): Promise<UploadedImage> {
  const extension = imageExtensionOf(file);
  if (!extension) {
    throw new ApiError(0, UPLOAD_INVALID_EXTENSION, 'JPG·PNG 이미지만 올릴 수 있어요.', 'upload');
  }

  const issued = await api.post(
    issuePath(target),
    ImageUploadUrlSchema,
    issueBody(target, extension),
    {
      signal,
    },
  );

  const route = 'PUT s3';
  const timeout = AbortSignal.timeout(PUT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(issued.presignedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': CONTENT_TYPE[extension] },
      credentials: 'omit',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch {
    if (signal?.aborted) throw signal.reason;
    // presigned URL(서명·만료)이 메시지에 남지 않게 URL 없는 에러로 바꾼다
    if (timeout.aborted) throw new ApiError(0, 'TIMEOUT', '', route);
    throw new ApiError(0, 'NETWORK', '', route);
  }
  if (!res.ok) {
    throw new ApiError(
      res.status,
      UPLOAD_PUT_FAILED,
      '이미지를 올리지 못했어요. 다시 시도해 주세요.',
      route,
    );
  }
  return { key: issued.key, url: issued.url };
}
