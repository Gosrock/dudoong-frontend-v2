import type { Options } from 'ky';
import type { z } from 'zod';

import { kyBase, unwrap } from './client';

const isServer = typeof window === 'undefined';

/** 요청마다 기준 주소를 정한다. 모듈 최상위에서 env를 읽지 않는다(tech-decisions §12). */
function prefixV2() {
  // 브라우저는 같은 출처(nginx가 /api를 백엔드로 보낸다). Request가 절대 URL을 요구해 origin을 붙인다.
  return isServer
    ? (process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v2')
    : `${window.location.origin}/api/v2`;
}

function prefixV1Auth() {
  const v2 = prefixV2();
  return v2.replace(/\/api\/v2$/, '/api/v1/auth');
}

type CallOptions = {
  /** 공개 GET. 쿠키를 싣지 않는다 — 사용자별 값은 viewer 쿼리가 받는다(tech-decisions §4). */
  public?: boolean;
  searchParams?: Options['searchParams'];
  signal?: AbortSignal;
};

function request<T>(
  method: 'get' | 'post' | 'patch' | 'put' | 'delete',
  prefix: string,
  path: string,
  schema: z.ZodType<T>,
  body?: unknown,
  opts: CallOptions = {},
): Promise<T> {
  const res = kyBase(path, {
    method,
    prefix,
    json: body,
    searchParams: opts.searchParams,
    signal: opts.signal,
    credentials: opts.public ? 'omit' : 'include',
  });
  return res.then((r) => unwrap(r, schema));
}

/** `/api/v2` 호출. 화면과 조회 정의는 ky를 직접 쓰지 않고 이 객체만 쓴다. */
export const api = {
  get: <T>(path: string, schema: z.ZodType<T>, opts?: CallOptions) =>
    request('get', prefixV2(), path, schema, undefined, opts),
  post: <T>(path: string, schema: z.ZodType<T>, body?: unknown, opts?: CallOptions) =>
    request('post', prefixV2(), path, schema, body, opts),
  patch: <T>(path: string, schema: z.ZodType<T>, body?: unknown, opts?: CallOptions) =>
    request('patch', prefixV2(), path, schema, body, opts),
  put: <T>(path: string, schema: z.ZodType<T>, body?: unknown, opts?: CallOptions) =>
    request('put', prefixV2(), path, schema, body, opts),
  delete: <T>(path: string, schema: z.ZodType<T>, body?: unknown, opts?: CallOptions) =>
    request('delete', prefixV2(), path, schema, body, opts),
};

/** `/api/v1/auth` 호출. 401 가로채기가 없다(Web Locks 재진입 방지 — tech-decisions §4). */
export const authApi = {
  post: <T>(path: string, schema: z.ZodType<T>, body?: unknown) =>
    request('post', prefixV1Auth(), path, schema, body),
  get: <T>(path: string, schema: z.ZodType<T>) => request('get', prefixV1Auth(), path, schema),
};
