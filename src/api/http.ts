import type { z } from 'zod';

import {
  type CallOptions,
  type DownloadOptions,
  prefixV1Auth,
  prefixV2,
  request,
  requestFile,
  withSessionRecovery,
} from './client';

const v2 = <T>(
  method: Parameters<typeof request>[0],
  path: string,
  schema: z.ZodType<T>,
  body?: unknown,
  opts?: CallOptions,
) => withSessionRecovery(opts?.public, () => request(method, prefixV2, path, schema, body, opts));

/**
 * `/api/v2` 호출. 화면과 조회 정의는 ky를 직접 쓰지 않고 이 객체만 쓴다.
 * 보호 요청의 401은 `dd:session`이 있을 때 재발급 후 한 번 다시 보낸다(`withSessionRecovery`). 공개 GET은 가로채지 않는다.
 */
export const api = {
  get: <T>(path: string, schema: z.ZodType<T>, opts?: CallOptions) =>
    v2('get', path, schema, undefined, opts),
  post: <T>(path: string, schema: z.ZodType<T>, body?: unknown, opts?: CallOptions) =>
    v2('post', path, schema, body, opts),
  patch: <T>(path: string, schema: z.ZodType<T>, body?: unknown, opts?: CallOptions) =>
    v2('patch', path, schema, body, opts),
  put: <T>(path: string, schema: z.ZodType<T>, body?: unknown, opts?: CallOptions) =>
    v2('put', path, schema, body, opts),
  delete: <T>(path: string, schema: z.ZodType<T>, body?: unknown, opts?: CallOptions) =>
    v2('delete', path, schema, body, opts),
  /** 래퍼 없는 파일(엑셀 GR-6·GI-3) → `{ blob, filename }`. 저장은 `src/utils/download`(`saveBlob`)가 한다. */
  download: (path: string, opts?: DownloadOptions) =>
    withSessionRecovery(false, () => requestFile(prefixV2, path, opts)),
};

/** 인증 호출 옵션. 쿠키는 언제나 싣는다(`state`·리프레시 쿠키를 주고받는다 — api-contract §9) */
export type AuthCallOptions = Pick<CallOptions, 'searchParams' | 'signal'>;

/**
 * `/api/v1/auth` 호출. 401 가로채기가 없다(Web Locks 재진입 방지 — tech-decisions §4).
 * 엔드포인트별 호출과 스키마는 `src/api/auth/`에 있다. 화면은 이 객체가 아니라 그쪽 함수를 쓴다.
 */
export const authApi = {
  post: <T>(path: string, schema: z.ZodType<T>, body?: unknown, opts?: AuthCallOptions) =>
    request('post', prefixV1Auth, path, schema, body, opts),
  get: <T>(path: string, schema: z.ZodType<T>, opts?: AuthCallOptions) =>
    request('get', prefixV1Auth, path, schema, undefined, opts),
};
