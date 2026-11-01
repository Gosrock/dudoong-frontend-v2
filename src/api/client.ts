// CSP — zod가 eval을 떠보지 않게(첫 파싱보다 먼저)
import './shared/zod-config';

import ky, { isNetworkError, isTimeoutError, type KyInstance, type Options } from 'ky';
import { z } from 'zod';

import { log } from '@/utils/log';

import { canRecoverSession, hasSessionLostFired, recoverSession } from './auth-handlers';
import { ApiError, SessionLostError } from './errors';
import { routePattern } from './shared/route-pattern';

/**
 * 요청 파이프라인. 기준 주소 계산 → ky 호출 → 본문 읽기(시간 제한) → 래퍼 해제·zod 파싱.
 * 화면과 조회 정의는 이 파일이 아니라 `http.ts`의 `api`·`authApi`를 쓴다.
 * 401 처리(`withSessionRecovery`)는 `api`(v2)에만 붙는다. `authApi`는 `request()`를 그대로 쓴다(tech-decisions §4).
 */

/** 요청 하나의 전체 시간(응답 헤더 + 본문). ky의 timeout은 헤더까지만 잰다. */
export const REQUEST_TIMEOUT_MS = 10_000;

const isServer = typeof window === 'undefined';
const DEFAULT_INTERNAL = 'http://localhost:8080/api/v2';

/** 에러 변환은 훅이 아니라 여기서 한다(ky 2.x에서 beforeError 변환이 동작하지 않았다 — tech-decisions §22). */
const kyBase: KyInstance = ky.create({
  throwHttpErrors: false,
  retry: 0,
  timeout: REQUEST_TIMEOUT_MS,
  credentials: 'include',
});

// ─── 기준 주소 ───────────────────────────────────────────────

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
export const prefixV2 = () => (isServer ? internalV2() : `${window.location.origin}/api/v2`);
export const prefixV1Auth = () =>
  isServer ? internalV2().replace(/\/v2$/, '/v1/auth') : `${window.location.origin}/api/v1/auth`;

// ─── 응답 ────────────────────────────────────────────────────

/** 응답 본문이 백엔드 래퍼(`{success, status, data | code, reason}`) 모양인지 본다. */
function isEnvelope(body: unknown): body is { success: boolean } & Record<string, unknown> {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { success?: unknown }).success === 'boolean'
  );
}

/**
 * 받은 본문 텍스트에서 래퍼를 벗기고 zod로 파싱한다. `ApiError.status`는 언제나 HTTP 상태다.
 * - JSON이 아니면(nginx HTML 502 등) `NON_JSON`
 * - JSON이지만 래퍼 모양이 아니면 `BAD_ENVELOPE`
 * - 스키마와 맞지 않으면 `PARSE_ERROR`(구조화 로그를 남기고 던진다. 값은 남기지 않는다)
 */
export function unwrap<T>(
  res: { status: number; ok: boolean },
  text: string,
  schema: z.ZodType<T>,
  route: string,
): T {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ApiError(res.status, 'NON_JSON', '', route);
  }
  if (!isEnvelope(body)) throw new ApiError(res.status, 'BAD_ENVELOPE', '', route);
  if (!res.ok || !body.success) {
    const code = typeof body.code === 'string' ? body.code : 'UNKNOWN';
    const reason = typeof body.reason === 'string' ? body.reason : '';
    throw new ApiError(res.status, code, reason, route);
  }
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) {
    log('error', 'api.parse_failed', {
      route,
      issues: parsed.error.issues.map((i) => i.path.join('.')),
    });
    throw new ApiError(res.status, 'PARSE_ERROR', '', route);
  }
  return parsed.data;
}

/** 본문 읽기에도 시간 제한을 건다. 끊기면 NETWORK, 시간을 넘기면 TIMEOUT, 호출자가 취소하면 그 사유를 던진다. */
async function readBody(res: Response, deadline: number, route: string, signal?: AbortSignal) {
  return readWithin(res, (r) => r.text(), deadline, route, signal);
}

async function readWithin<T>(
  res: Response,
  read: (res: Response) => Promise<T>,
  deadline: number,
  route: string,
  signal?: AbortSignal,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => {
        void res.body?.cancel();
        reject(new ApiError(0, 'TIMEOUT', '', route));
      },
      Math.max(0, deadline - performance.now()),
    );
  });
  try {
    return await Promise.race([read(res), timeout]);
  } catch (e) {
    if (signal?.aborted) throw signal.reason;
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, 'NETWORK', '', route);
  } finally {
    clearTimeout(timer);
  }
}

// ─── 요청 ────────────────────────────────────────────────────

export type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';

export type CallOptions = {
  /** 공개 GET. 쿠키를 싣지 않는다 — 사용자별 값은 viewer 쿼리가 받는다(tech-decisions §4). */
  public?: boolean;
  searchParams?: Options['searchParams'];
  signal?: AbortSignal;
  /**
   * 요청 하나의 전체 시간(ms). 기본 `REQUEST_TIMEOUT_MS`. 서버가 오래 걸려도 결과를 기다려야 하는 변경만 늘린다
   * (주문 생성 — `ORDER_CREATE_TIMEOUT_MS`, 이슈 #92-4)
   */
  timeout?: number;
};

/**
 * 요청 하나. async라서 기준 주소 계산 실패도 Promise 거절로 나간다(동기로 던지면 프리렌더 중 엉뚱한 에러가 함께 찍힌다).
 * ky의 네트워크·타임아웃 오류는 URL을 메시지에 담고 있어(토큰이 로그에 남는다) URL 없는 `ApiError`로 바꾼다.
 */
export async function request<T>(
  method: Method,
  prefix: () => string,
  path: string,
  schema: z.ZodType<T>,
  body?: unknown,
  opts: CallOptions = {},
): Promise<T> {
  const route = `${method.toUpperCase()} ${routePattern(path)}`;
  // Date.now()는 Cache Components 프리렌더에서 금지된다 — 시간 측정은 performance.now()
  const timeout = opts.timeout ?? REQUEST_TIMEOUT_MS;
  const deadline = performance.now() + timeout;
  let res: Response;
  try {
    res = await kyBase(path, {
      method,
      timeout,
      prefix: prefix(),
      json: body,
      searchParams: opts.searchParams,
      signal: opts.signal,
      credentials: opts.public ? 'omit' : 'include',
    });
  } catch (e) {
    if (isTimeoutError(e)) throw new ApiError(0, 'TIMEOUT', '', route);
    if (isNetworkError(e)) throw new ApiError(0, 'NETWORK', '', route);
    throw e;
  }
  const text = await readBody(res, deadline, route, opts.signal);
  return unwrap(res, text, schema, route);
}

// ─── 401 처리 ────────────────────────────────────────────────

/**
 * 보호 요청의 401 처리(tech-decisions §4 인증 표).
 * - 서버, 공개 GET(`credentials: 'omit'`)은 가로채지 않는다
 * - `dd:session`이 없으면(또는 핸들러 미등록) 401을 그대로 던진다 — 익명 방문자의 요청 수를 늘리지 않는다
 * - 있으면 재발급(탭 안 단일 비행 + 탭 사이 Web Locks) 뒤 원 요청을 한 번 다시 보낸다. 다시 보낸 요청의 실패는 그대로 던진다
 * - 이 탭에서 세션 상실이 이미 시작됐으면 401은 모두 `SessionLostError`(곧 이동한다)
 */
export async function withSessionRecovery<T>(
  isPublic: boolean | undefined,
  call: () => Promise<T>,
) {
  if (isServer || isPublic) return call();
  const sentAt = Date.now();
  try {
    return await call();
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401) throw e;
    if (hasSessionLostFired()) throw new SessionLostError();
    if (!canRecoverSession()) throw e;
    await recoverSession(sentAt);
    return call();
  }
}

// ─── 파일 내려받기 ───────────────────────────────────────────

/** 엑셀은 행이 많으면 만드는 데 오래 걸린다. 일반 요청(10초)보다 길게 둔다. */
export const DOWNLOAD_TIMEOUT_MS = 60_000;

export type DownloadOptions = Pick<CallOptions, 'searchParams' | 'signal'>;
export type Downloaded = { blob: Blob; filename: string | null };

/**
 * 래퍼 없는 파일 응답(엑셀 GR-6·GI-3, api-contract §1). 성공 본문은 파싱하지 않고 Blob으로 돌려준다.
 * 실패 응답은 JSON 에러 래퍼라 `request()`와 같은 `ApiError`가 된다. 성공인데 JSON이 오면(래퍼) 파일이 아니므로
 * 에러 래퍼면 그 `ApiError`, 아니면 `BAD_ENVELOPE`.
 * 파일 이름은 `Content-Disposition`에서 읽고(RFC 6266/5987 `filename*` 우선), 없으면 `null` — 이름은 호출부가 정한다.
 */
export async function requestFile(
  prefix: () => string,
  path: string,
  opts: DownloadOptions = {},
): Promise<Downloaded> {
  const route = `GET ${routePattern(path)}`;
  const deadline = performance.now() + DOWNLOAD_TIMEOUT_MS;
  let res: Response;
  try {
    res = await kyBase(path, {
      method: 'get',
      prefix: prefix(),
      searchParams: opts.searchParams,
      signal: opts.signal,
      timeout: DOWNLOAD_TIMEOUT_MS,
    });
  } catch (e) {
    if (isTimeoutError(e)) throw new ApiError(0, 'TIMEOUT', '', route);
    if (isNetworkError(e)) throw new ApiError(0, 'NETWORK', '', route);
    throw e;
  }
  const isJson = (res.headers.get('content-type') ?? '').includes('json');
  if (!res.ok || isJson) {
    const text = await readWithin(res, (r) => r.text(), deadline, route, opts.signal);
    unwrap(res, text, z.unknown(), route);
    // 성공 래퍼가 왔다 — 파일이 아니다
    throw new ApiError(res.status, 'BAD_ENVELOPE', '', route);
  }
  const blob = await readWithin(res, (r) => r.blob(), deadline, route, opts.signal);
  return {
    blob,
    filename: parseContentDispositionFilename(res.headers.get('content-disposition')),
  };
}

/**
 * `Content-Disposition`의 파일 이름. `filename*=UTF-8''%ED%95%9C.xlsx`(RFC 5987)를 `filename="…"`보다 먼저 본다.
 * 백엔드(Spring `ContentDisposition.attachment().filename(name)`)는 지금 ASCII `filename="orders-1.xlsx"`만 보낸다.
 * 경로 구분자는 지운다(파일 이름으로만 쓴다). 못 읽으면 `null`.
 */
export function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;
  const params = splitParams(header);
  const extended = params.get('filename*');
  if (extended) {
    const m = /^([\w!#$%&+^`{}~-]*)'[^']*'(.*)$/.exec(extended);
    if (m) {
      const decoded = decodeExtValue(m[1] ?? '', m[2] ?? '');
      if (decoded) return sanitizeFilename(decoded);
    }
  }
  const plain = params.get('filename');
  return plain ? sanitizeFilename(plain) : null;
}

/** `type; a=b; c="d; e"` → Map(a→b, c→d; e). 따옴표 안의 `;`와 `\"` 이스케이프를 지킨다. 이름은 소문자로. */
function splitParams(header: string) {
  const params = new Map<string, string>();
  const re = /;\s*([^\s=;]+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^;]*))/g;
  for (const m of header.matchAll(re)) {
    const name = (m[1] ?? '').toLowerCase();
    if (params.has(name)) continue;
    const value = m[2] !== undefined ? m[2].replace(/\\(.)/g, '$1') : (m[3] ?? '').trim();
    params.set(name, value);
  }
  return params;
}

function decodeExtValue(charset: string, value: string): string | null {
  try {
    if (charset.toLowerCase() === 'utf-8') return decodeURIComponent(value);
    // ISO-8859-1: %XX 하나가 글자 하나
    return value.replace(/%([0-9a-f]{2})/gi, (_, h: string) =>
      String.fromCharCode(parseInt(h, 16)),
    );
  } catch {
    return null;
  }
}

function sanitizeFilename(name: string): string | null {
  const base = name.split(/[\\/]/).pop()?.trim() ?? '';
  return base && base !== '.' && base !== '..' ? base : null;
}
