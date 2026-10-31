// @vitest-environment node
// 서버 분기(window 없음)를 검사한다. jsdom 테스트는 늘 브라우저 분기만 탄다.
import http_ from 'node:http';
import type { AddressInfo } from 'node:net';

import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { server } from './__mocks__/server';
import { ApiError } from './errors';
import { api, authApi } from './http';
import { routePattern } from './shared/route-pattern';

const Echo = z.object({ value: z.number() });
const ok = (value: number) =>
  HttpResponse.json({ success: true, status: 200, data: { value }, timeStamp: '' });

describe('서버 분기', () => {
  const original = process.env.API_INTERNAL_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.API_INTERNAL_URL;
    else process.env.API_INTERNAL_URL = original;
  });

  it('fetch 자체가 실패하면 URL 없는 ApiError(0, NETWORK) — reason은 비우고 route에 패턴', async () => {
    // 기본 핸들러에 GG-3이 있어 이 테스트에서만 네트워크 오류로 바꾼다
    server.use(http.get('*/api/v2/gifts/:giftToken', () => HttpResponse.error()));
    process.env.API_INTERNAL_URL = 'http://backend.test/api/v2';
    const error = await api.get('gifts/secrettokenlower', Echo).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 0,
      code: 'NETWORK',
      reason: '',
      route: 'GET gifts/:param',
    });
    expect(String((error as Error).message)).not.toContain('secret');
  });

  it('API_INTERNAL_URL이 /api/v2로 끝나지 않으면 Promise 거절(동기 throw 아님)', async () => {
    process.env.API_INTERNAL_URL = 'http://backend.test';
    const result = api.get('tags', Echo);
    expect(result).toBeInstanceOf(Promise);
    await expect(result).rejects.toThrow('/api/v2');
  });

  it('빈 문자열이면 기본값을 쓴다', async () => {
    process.env.API_INTERNAL_URL = '';
    server.use(http.get('http://localhost:8080/api/v2/echo', () => ok(7)));
    await expect(api.get('echo', Echo)).resolves.toEqual({ value: 7 });
  });

  it('authApi 서버 주소는 경로 접두사를 유지한다', async () => {
    process.env.API_INTERNAL_URL = 'http://backend.test/prefix/api/v2';
    server.use(http.post('http://backend.test/prefix/api/v1/auth/token/refresh', () => ok(1)));
    await expect(authApi.post('token/refresh', Echo)).resolves.toEqual({ value: 1 });
  });
});

describe('서버 조회에는 토큰이 붙지 않는다', () => {
  // 서버 조회는 공개 GET만 한다. 사용자 쿠키를 전달하는 코드가 생기면(예: next/headers cookies()를 붙임) 여기서 깨진다
  const original = process.env.API_INTERNAL_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.API_INTERNAL_URL;
    else process.env.API_INTERNAL_URL = original;
  });

  it.each([
    ['공개 GET', { public: true }],
    ['옵션 없음', undefined],
  ] as const)('%s — Cookie·Authorization 헤더가 없다', async (_, opts) => {
    process.env.API_INTERNAL_URL = 'http://backend.test/api/v2';
    let headers: Headers | undefined;
    server.use(
      http.get('http://backend.test/api/v2/events/1', ({ request }) => {
        headers = request.headers;
        return ok(1);
      }),
    );
    await expect(api.get('events/1', Echo, opts)).resolves.toEqual({ value: 1 });
    expect(headers?.get('cookie')).toBeNull();
    expect(headers?.get('authorization')).toBeNull();
  });
});

describe('본문 읽기', () => {
  // MSW를 거치지 않는 실제 소켓으로 끊김을 만든다
  let srv: http_.Server;
  let base = '';
  beforeAll(async () => {
    server.close();
    srv = http_.createServer((req, res) => {
      if (req.url?.endsWith('/drop')) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.write('{"success":tr');
        res.socket?.destroy();
        return;
      }
      res.writeHead(404).end();
    });
    await new Promise<void>((r) => srv.listen(0, '127.0.0.1', () => r()));
    base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}/api/v2`;
  });
  afterAll(() => {
    srv.close();
    server.listen({ onUnhandledFrame: 'error' });
  });

  it('헤더를 받은 뒤 연결이 끊기면 NETWORK', async () => {
    process.env.API_INTERNAL_URL = base;
    await expect(api.get('drop', Echo)).rejects.toMatchObject({ status: 0, code: 'NETWORK' });
  });
});

describe('routePattern', () => {
  it('id·토큰처럼 보이는 세그먼트를 가린다', () => {
    expect(routePattern('events/12/ticket-items')).toBe('events/:param/ticket-items');
    expect(routePattern('gifts/aB3xYz')).toBe('gifts/:param');
    expect(routePattern('gifts/alllowercase')).toBe('gifts/:param');
    expect(routePattern('me/orders?page=2')).toBe('me/orders');
  });
});
