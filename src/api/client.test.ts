import { http, HttpResponse } from 'msw';
import { z } from 'zod';

import { server } from '@/mocks/server';

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
          { success: false, status: 403, code: 'AUTH_403_2', reason: '토큰 없음', timeStamp: '' },
          { status: 401 },
        ),
      ),
    );
    await expect(api.get('echo', Echo)).rejects.toMatchObject({
      status: 401,
      code: 'AUTH_403_2',
      reason: '토큰 없음',
    });
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
