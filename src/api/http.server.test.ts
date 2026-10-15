// @vitest-environment node
// 서버 분기(window 없음)를 검사한다. jsdom 테스트는 늘 브라우저 분기만 탄다.
import { http, HttpResponse } from 'msw';
import { z } from 'zod';

import { server } from './__mocks__/server';
import { ApiError } from './errors';
import { api, authApi, routePattern } from './http';

const Echo = z.object({ value: z.number() });

describe('서버 분기', () => {
  const original = process.env.API_INTERNAL_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.API_INTERNAL_URL;
    else process.env.API_INTERNAL_URL = original;
  });

  it('닫힌 포트면 URL 없는 ApiError(0, NETWORK)', async () => {
    process.env.API_INTERNAL_URL = 'http://127.0.0.1:1/api/v2';
    const error = await api.get('gifts/SECRET-TOKEN-123', Echo).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, code: 'NETWORK', reason: 'GET gifts/:param' });
    expect(String((error as Error).message)).not.toContain('SECRET');
  });

  it('API_INTERNAL_URL이 /api/v2로 끝나지 않으면 Promise 거절(동기 throw 아님)', async () => {
    process.env.API_INTERNAL_URL = 'http://127.0.0.1:1';
    const result = api.get('tags', Echo);
    expect(result).toBeInstanceOf(Promise);
    await expect(result).rejects.toThrow('/api/v2');
  });

  it('빈 문자열이면 기본값을 쓴다', async () => {
    process.env.API_INTERNAL_URL = '';
    server.use(
      http.get('http://localhost:8080/api/v2/echo', () =>
        HttpResponse.json({ success: true, status: 200, data: { value: 7 }, timeStamp: '' }),
      ),
    );
    await expect(api.get('echo', Echo)).resolves.toEqual({ value: 7 });
  });

  it('authApi 서버 주소는 경로 접두사를 유지한다', async () => {
    process.env.API_INTERNAL_URL = 'http://127.0.0.1:1/prefix/api/v2';
    await expect(authApi.post('token/refresh', Echo)).rejects.toMatchObject({
      code: 'NETWORK',
      reason: 'POST token/refresh',
    });
  });
});

describe('routePattern', () => {
  it('id·토큰처럼 보이는 세그먼트를 가린다', () => {
    expect(routePattern('events/12/ticket-items')).toBe('events/:param/ticket-items');
    expect(routePattern('gifts/aB3xYz')).toBe('gifts/:param');
    expect(routePattern('me/orders?page=2')).toBe('me/orders');
  });
});
