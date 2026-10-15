import { isNetworkError, isTimeoutError, type Options } from 'ky';
import type { z } from 'zod';

import { kyBase, unwrap } from './client';
import { ApiError } from './errors';

const isServer = typeof window === 'undefined';
const DEFAULT_INTERNAL = 'http://localhost:8080/api/v2';

/**
 * 서버에서 백엔드를 부를 주소. 런타임에 읽는다(모듈 최상위에서 읽지 않는다 — tech-decisions §12).
 * 값은 `/api/v2`로 끝나야 한다. 틀리면 조용히 404(→ notFound)가 나지 않게 바로 실패시킨다.
 */
function internalV2() {
  // 빈 문자열도 기본값으로 본다(compose에서 `API_INTERNAL_URL=`로 비워 둔 경우)
  const raw = (process.env.API_INTERNAL_URL || DEFAULT_INTERNAL).replace(/\/+$/, '');
  if (!raw.endsWith('/api/v2')) {
    throw new Error(`API_INTERNAL_URL은 /api/v2로 끝나야 한다: ${raw}`);
  }
  return raw;
}

/** 브라우저는 같은 출처(nginx가 /api를 백엔드로 보낸다). ky의 Request가 절대 URL을 요구해 origin을 붙인다. */
const prefixV2 = () => (isServer ? internalV2() : `${window.location.origin}/api/v2`);
const prefixV1Auth = () =>
  isServer ? internalV2().replace(/\/v2$/, '/v1/auth') : `${window.location.origin}/api/v1/auth`;

/**
 * 로그용 라우트 패턴. id·토큰처럼 보이는 세그먼트를 `:param`으로 가린다(tech-decisions §13).
 * 소문자 단어와 하이픈만으로 된 세그먼트(`events`, `ticket-items`)만 그대로 둔다.
 */
export function routePattern(path: string) {
  return path
    .split('?')[0]!
    .split('/')
    .map((seg) => (/^[a-z][a-z-]*$/.test(seg) ? seg : ':param'))
    .join('/');
}

type CallOptions = {
  /** 공개 GET. 쿠키를 싣지 않는다 — 사용자별 값은 viewer 쿼리가 받는다(tech-decisions §4). */
  public?: boolean;
  searchParams?: Options['searchParams'];
  signal?: AbortSignal;
};

/**
 * 요청 하나. async라서 기준 주소 계산 실패도 Promise 거절로 나간다(동기로 던지면 프리렌더 중 엉뚱한 에러가 함께 찍힌다).
 * ky의 네트워크·타임아웃 오류는 URL을 메시지에 담고 있어(토큰이 로그에 남는다) URL 없는 `ApiError`로 바꾼다.
 */
async function request<T>(
  method: 'get' | 'post' | 'patch' | 'put' | 'delete',
  prefix: () => string,
  path: string,
  schema: z.ZodType<T>,
  body?: unknown,
  opts: CallOptions = {},
): Promise<T> {
  const route = `${method.toUpperCase()} ${routePattern(path)}`;
  let res: Response;
  try {
    res = await kyBase(path, {
      method,
      prefix: prefix(),
      json: body,
      searchParams: opts.searchParams,
      signal: opts.signal,
      credentials: opts.public ? 'omit' : 'include',
    });
  } catch (e) {
    if (isTimeoutError(e)) throw new ApiError(0, 'TIMEOUT', route);
    if (isNetworkError(e)) throw new ApiError(0, 'NETWORK', route);
    throw e;
  }
  return unwrap(res, schema, route);
}

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
