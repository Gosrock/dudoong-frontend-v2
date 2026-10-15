import { ApiError } from './errors';
import { getQueryClient } from './query-client';

const retry = getQueryClient().getDefaultOptions().queries?.retry as (
  n: number,
  e: unknown,
) => boolean;

describe('QueryClient 재시도 규칙', () => {
  it('5xx와 네트워크 오류만 1회', () => {
    expect(retry(0, new ApiError(502, 'NON_JSON', ''))).toBe(true);
    expect(retry(0, new ApiError(0, 'NETWORK', 'GET tags'))).toBe(true);
    expect(retry(0, new ApiError(0, 'TIMEOUT', 'GET tags'))).toBe(true);
    expect(retry(1, new ApiError(502, 'NON_JSON', ''))).toBe(false);
  });

  it('4xx, 파싱 실패, 그 밖의 예외는 재시도하지 않는다', () => {
    expect(retry(0, new ApiError(404, 'Event_404_1', ''))).toBe(false);
    expect(retry(0, new ApiError(200, 'PARSE_ERROR', ''))).toBe(false);
    expect(retry(0, new Error('boom'))).toBe(false);
    expect(retry(0, new TypeError('Failed to fetch'))).toBe(false);
  });
});
