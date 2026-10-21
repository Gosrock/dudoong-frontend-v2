import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

import { getResponse, type RequestHandler } from 'msw';

import { handlers as defaultHandlers } from '@/api/__mocks__/handlers';

/**
 * 가짜 "nginx + 백엔드". 운영 nginx처럼 `/api/*`는 백엔드(여기서는 MSW 핸들러)가 받고
 * 나머지는 Next standalone 서버로 넘긴다(tech-decisions §25). 브라우저는 이 출처로 접속하고,
 * Next 서버의 서버 조회는 `API_INTERNAL_URL`로 같은 곳을 부른다. 그래서 서버 조회와 브라우저 요청이
 * 같은 핸들러를 탄다(tech-decisions §10).
 *
 * Playwright 워커 프로세스 안에서 뜬다 — 테스트가 함수로 된 MSW 핸들러를 그대로 넘길 수 있다.
 * 포트가 하나라 워커도 하나다(playwright.config.ts `workers: 1`).
 */

export type ApiCall = {
  method: string;
  /** `/api/v2/tags?x=1` 형태 */
  path: string;
  /** Next 서버발(서버 조회)인지 브라우저발인지. Node fetch(undici)는 UA가 `node`이고 `sec-fetch-mode`까지 붙여 UA로 가른다 */
  from: 'server' | 'browser';
  status: number;
};

/** 두둥 토큰 쿠키의 SameSite. `null`이면 핸들러가 내린 값 그대로(mock 기본 `Lax`) */
export type TokenCookieSameSite = 'Strict' | 'Lax' | 'None' | null;

export type MockBackend = {
  origin: string;
  /**
   * 두둥 토큰 쿠키(`accessToken`·`refreshToken`)의 `SameSite`를 바꿔 내린다. 운영(`Strict`) 재현용(plan P4b).
   * `oauth_state` 쿠키는 백엔드처럼 언제나 `Lax`다. `reset()`이 `null`로 되돌린다(시작 옵션 값으로)
   */
  setTokenCookieSameSite: (value: TokenCookieSameSite) => void;
  /** 이번 테스트에만 쓰는 핸들러. 앞에 둔 것이 먼저 맞는다(MSW `server.use`와 같다) */
  use: (...handlers: RequestHandler[]) => void;
  reset: () => void;
  /** 이번 테스트에서 받은 `/api` 요청 */
  calls: () => ApiCall[];
  /** 핸들러가 없어 `MOCK_UNHANDLED`로 돌려준 요청 */
  unhandled: () => ApiCall[];
  close: () => Promise<void>;
};

const API_PREFIX = '/api/';

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function toFetchRequest(req: IncomingMessage, origin: string, body: Buffer) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }
  const method = req.method ?? 'GET';
  return new Request(new URL(req.url ?? '/', origin), {
    method,
    headers,
    body:
      method === 'GET' || method === 'HEAD' || body.length === 0 ? undefined : new Uint8Array(body),
  });
}

const TOKEN_COOKIE = /^(accessToken|refreshToken)=/;

/** 두둥 토큰 쿠키의 SameSite 속성을 바꾼다(없으면 붙인다) */
export function rewriteSameSite(cookie: string, sameSite: TokenCookieSameSite): string {
  if (sameSite === null || !TOKEN_COOKIE.test(cookie)) return cookie;
  const parts = cookie.split(/;\s*/).filter((p) => !/^samesite=/i.test(p));
  return [...parts, `SameSite=${sameSite}`].join('; ');
}

async function writeFetchResponse(
  res: ServerResponse,
  response: Response,
  sameSite: TokenCookieSameSite,
) {
  const headers: Record<string, string | string[]> = {};
  response.headers.forEach((value, key) => {
    if (key !== 'set-cookie') headers[key] = value;
  });
  // Set-Cookie는 여러 개를 한 줄로 합치면 깨진다(재발급·로그아웃은 쿠키 둘을 내려준다)
  const cookies = response.headers.getSetCookie().map((c) => rewriteSameSite(c, sameSite));
  if (cookies.length > 0) headers['set-cookie'] = cookies;
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
}

/** 백엔드에 없는 경로. 테스트는 끝날 때 `unhandled()`가 비었는지 본다(fixtures.ts). */
function unhandledResponse() {
  return Response.json(
    { success: false, status: 500, code: 'MOCK_UNHANDLED', reason: '', timeStamp: '' },
    { status: 500 },
  );
}

function proxyToApp(req: IncomingMessage, res: ServerResponse, appOrigin: string) {
  const target = new URL(req.url ?? '/', appOrigin);
  const upstream = http.request(target, { method: req.method, headers: req.headers }, (upRes) => {
    res.writeHead(upRes.statusCode ?? 502, upRes.headers);
    upRes.pipe(res);
  });
  // Next가 아직 안 떴거나 끊겼을 때. 응답을 시작했으면 끊는 수밖에 없다
  upstream.on('error', () => {
    if (res.headersSent) res.destroy();
    else res.writeHead(502, { 'content-type': 'text/plain' }).end('app unreachable');
  });
  req.pipe(upstream);
}

export async function startMockBackend({
  port,
  appOrigin,
  tokenCookieSameSite = null,
}: {
  port: number;
  appOrigin: string;
  /** 시작할 때의 토큰 쿠키 SameSite(`pnpm dev:mock`의 `MOCK_COOKIE_SAMESITE`) */
  tokenCookieSameSite?: TokenCookieSameSite;
}): Promise<MockBackend> {
  let overrides: RequestHandler[] = [];
  let sameSite: TokenCookieSameSite = tokenCookieSameSite;
  let calls: ApiCall[] = [];
  let unhandled: ApiCall[] = [];
  const origin = `http://127.0.0.1:${port}`;

  const server = http.createServer((req, res) => {
    if (!req.url?.startsWith(API_PREFIX)) {
      proxyToApp(req, res, appOrigin);
      return;
    }
    void (async () => {
      const body = await readBody(req);
      const request = toFetchRequest(req, origin, body);
      const found = await getResponse([...overrides, ...defaultHandlers], request);
      const response = found ?? unhandledResponse();
      const call: ApiCall = {
        method: req.method ?? 'GET',
        path: req.url ?? '',
        from: req.headers['user-agent']?.startsWith('Mozilla/') ? 'browser' : 'server',
        status: response.status,
      };
      calls.push(call);
      if (!found) unhandled.push(call);
      await writeFetchResponse(res, response, sameSite);
    })().catch((e: unknown) => {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end(`mock backend error: ${e instanceof Error ? e.message : String(e)}`);
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve());
  });
  const actualPort = (server.address() as AddressInfo).port;

  return {
    origin: `http://127.0.0.1:${actualPort}`,
    use: (...handlers) => {
      overrides = [...handlers, ...overrides];
    },
    setTokenCookieSameSite: (value) => {
      sameSite = value;
    },
    reset: () => {
      overrides = [];
      sameSite = tokenCookieSameSite;
      calls = [];
      unhandled = [];
    },
    calls: () => [...calls],
    unhandled: () => [...unhandled],
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
