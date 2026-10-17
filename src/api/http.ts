import type { z } from 'zod';

import { type CallOptions, prefixV1Auth, prefixV2, request } from './client';

/** `/api/v2` 호출. 화면과 조회 정의는 ky를 직접 쓰지 않고 이 객체만 쓴다. */
export const api = {
  get: <T>(path: string, schema: z.ZodType<T>, opts?: CallOptions) =>
    request('get', prefixV2, path, schema, undefined, opts),
  post: <T>(path: string, schema: z.ZodType<T>, body?: unknown, opts?: CallOptions) =>
    request('post', prefixV2, path, schema, body, opts),
  patch: <T>(path: string, schema: z.ZodType<T>, body?: unknown, opts?: CallOptions) =>
    request('patch', prefixV2, path, schema, body, opts),
  put: <T>(path: string, schema: z.ZodType<T>, body?: unknown, opts?: CallOptions) =>
    request('put', prefixV2, path, schema, body, opts),
  delete: <T>(path: string, schema: z.ZodType<T>, body?: unknown, opts?: CallOptions) =>
    request('delete', prefixV2, path, schema, body, opts),
};

/** `/api/v1/auth` 호출. 401 가로채기가 없다(Web Locks 재진입 방지 — tech-decisions §4). */
export const authApi = {
  post: <T>(path: string, schema: z.ZodType<T>, body?: unknown) =>
    request('post', prefixV1Auth, path, schema, body),
  get: <T>(path: string, schema: z.ZodType<T>) => request('get', prefixV1Auth, path, schema),
};
