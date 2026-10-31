import { queryOptions } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { serverQuery } from './serverQuery';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('serverQuery 실패 로그', () => {
  it('ApiError가 아닌 에러는 이름만 — 메시지(쿼리 키 · 토큰)를 남기지 않는다', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const options = queryOptions({
      queryKey: ['gifts', 'SECRET-GIFT-TOKEN'],
      queryFn: () => {
        throw new TypeError('failed for ["gifts","SECRET-GIFT-TOKEN"]');
      },
    });
    await expect(serverQuery(options)).rejects.toThrow(TypeError);
    const line = String(error.mock.calls[0]?.[0]);
    expect(JSON.parse(line)).toMatchObject({
      event: 'server_query.failed',
      resource: 'gifts',
      code: 'TypeError',
    });
    expect(line).not.toContain('SECRET-GIFT-TOKEN');
  });
});
