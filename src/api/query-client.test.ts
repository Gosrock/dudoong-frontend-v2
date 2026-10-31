import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setErrorNotifier } from './error-toast';
import { ApiError, SessionLostError } from './errors';
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

describe('전역 에러 토스트', () => {
  const notify = vi.fn();
  const qc = getQueryClient();
  beforeEach(() => {
    setErrorNotifier(notify);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    setErrorNotifier(null);
    notify.mockReset();
    qc.clear();
    vi.restoreAllMocks();
  });

  it('변경 실패는 토스트하지 않고 로그만 남긴다(화면 반응은 호출 쪽 handleError)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await qc
      .getMutationCache()
      .build(qc, {
        mutationFn: () => Promise.reject(new ApiError(400, 'Order_400_24', '취소할 수 없어요')),
      })
      .execute(undefined)
      .catch(() => {});
    expect(notify).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('mutation.failed');
  });

  it('조회 첫 로딩 실패는 토스트하지 않고, 배경 재조회 실패만 queryKey 해시 id로', async () => {
    const error = new ApiError(400, 'Event_400_1', '실패');
    await qc
      .fetchQuery({ queryKey: ['first'], queryFn: () => Promise.reject(error), retry: false })
      .catch(() => {});
    expect(notify).not.toHaveBeenCalled();

    qc.setQueryData(['bg'], { v: 1 });
    await qc
      .fetchQuery({
        queryKey: ['bg'],
        queryFn: () => Promise.reject(error),
        retry: false,
        staleTime: 0,
      })
      .catch(() => {});
    expect(notify).toHaveBeenCalledWith('실패', 'query:["bg"]');
  });

  it('배경 재조회라도 세션 상실은 토스트하지 않는다', async () => {
    qc.setQueryData(['s'], 1);
    await qc
      .fetchQuery({
        queryKey: ['s'],
        queryFn: () => Promise.reject(new SessionLostError()),
        retry: false,
      })
      .catch(() => {});
    expect(notify).not.toHaveBeenCalled();
  });

  it('무한 목록의 다음 페이지 실패는 토스트하지 않는다(하단 재시도가 맡는다)', async () => {
    const key = ['list', 'infinite'];
    const queryFn = ({ pageParam }: { pageParam: number }) =>
      pageParam === 0 ? Promise.resolve({ page: 0 }) : Promise.reject(new ApiError(500, 'X', 'x'));
    const options = {
      queryKey: key,
      queryFn,
      initialPageParam: 0,
      getNextPageParam: (last: { page: number }) => last.page + 1,
      retry: false,
    } as const;
    await qc.fetchInfiniteQuery(options);
    const observer = new (await import('@tanstack/react-query')).InfiniteQueryObserver(qc, options);
    await observer.fetchNextPage();
    expect(observer.getCurrentResult().isFetchNextPageError).toBe(true);
    expect(notify).not.toHaveBeenCalled();
  });
});
