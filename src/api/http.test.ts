import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { server } from './__mocks__/server';
import { ApiError } from './errors';
import { api } from './http';

const Echo = z.object({ value: z.number() });

describe('api', () => {
  it('성공 래퍼를 벗기고 zod로 파싱한다', async () => {
    server.use(
      http.get('*/api/v2/echo', () =>
        HttpResponse.json({ success: true, status: 200, data: { value: 1 }, timeStamp: '' }),
      ),
    );
    await expect(api.get('echo', Echo)).resolves.toEqual({ value: 1 });
  });

  it('에러 본문을 ApiError(HTTP 상태, code, reason)로 바꾼다', async () => {
    server.use(
      http.get('*/api/v2/echo', () =>
        HttpResponse.json(
          { success: false, status: 401, code: 'AUTH_401_2', reason: '토큰 없음', timeStamp: '' },
          { status: 401 },
        ),
      ),
    );
    await expect(api.get('echo', Echo)).rejects.toMatchObject({
      status: 401,
      code: 'AUTH_401_2',
      reason: '토큰 없음',
    });
  });

  it('본문 status가 HTTP 상태와 달라도 HTTP 상태를 쓴다(#808 전 토큰 없음 = HTTP 401 + 본문 403 같은 응답)', async () => {
    server.use(
      http.get('*/api/v2/echo', () =>
        HttpResponse.json(
          { success: false, status: 403, code: 'AUTH_403_2', reason: '', timeStamp: '' },
          { status: 401 },
        ),
      ),
    );
    await expect(api.get('echo', Echo)).rejects.toMatchObject({ status: 401, code: 'AUTH_403_2' });
  });

  it('본문이 JSON이 아니면(nginx HTML 502) NON_JSON', async () => {
    server.use(
      http.get('*/api/v2/echo', () => new HttpResponse('<html>502</html>', { status: 502 })),
    );
    const error = await api.get('echo', Echo).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: 'NON_JSON' });
  });

  it('모르는 enum 값은 UNKNOWN으로 받는다', async () => {
    const { TagGroupsSchema } = await import('./event/schema');
    server.use(
      http.get('*/api/v2/tags', () =>
        HttpResponse.json({
          success: true,
          status: 200,
          data: [{ category: 'NEW_ONE', tags: [] }],
          timeStamp: '',
        }),
      ),
    );
    await expect(api.get('tags', TagGroupsSchema)).resolves.toEqual([
      { category: 'UNKNOWN', tags: [] },
    ]);
  });
});

describe('api 엣지 케이스', () => {
  it('본문이 null이면 BAD_ENVELOPE(TypeError가 새지 않는다)', async () => {
    server.use(http.get('*/api/v2/echo', () => HttpResponse.json(null)));
    await expect(api.get('echo', Echo)).rejects.toMatchObject({
      status: 200,
      code: 'BAD_ENVELOPE',
    });
  });

  it('스키마와 맞지 않으면 PARSE_ERROR', async () => {
    server.use(
      http.get('*/api/v2/echo', () =>
        HttpResponse.json({ success: true, status: 200, data: { value: 'x' }, timeStamp: '' }),
      ),
    );
    await expect(api.get('echo', Echo)).rejects.toMatchObject({ code: 'PARSE_ERROR' });
  });

  it('enum 필드가 없으면 UNKNOWN으로 삼키지 않고 PARSE_ERROR', async () => {
    const { TagGroupsSchema } = await import('./event/schema');
    server.use(
      http.get('*/api/v2/tags', () =>
        HttpResponse.json({ success: true, status: 200, data: [{ tags: [] }], timeStamp: '' }),
      ),
    );
    await expect(api.get('tags', TagGroupsSchema)).rejects.toMatchObject({ code: 'PARSE_ERROR' });
  });
});
