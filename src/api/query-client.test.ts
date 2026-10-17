import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, SessionLostError } from './errors';
import { handleCodes } from './handle-codes';
import { FALLBACK_ERROR_MESSAGE, getQueryClient, setErrorNotifier } from './query-client';

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

  const mutate = (error: unknown, meta?: Record<string, unknown>) =>
    qc
      .getMutationCache()
      .build(qc, { mutationFn: () => Promise.reject(error), meta })
      .execute(undefined)
      .catch(() => {});

  it('변경 실패는 reason으로 토스트, id는 코드', async () => {
    await mutate(new ApiError(400, 'Order_400_24', '취소할 수 없어요'));
    expect(notify).toHaveBeenCalledWith('취소할 수 없어요', 'mutation:Order_400_24');
  });

  it('reason이 비면 고정 문구', async () => {
    await mutate(new ApiError(0, 'NETWORK', ''));
    expect(notify).toHaveBeenCalledWith(FALLBACK_ERROR_MESSAGE, 'mutation:NETWORK');
  });

  it('handleCodes로 맡긴 코드·meta.handled·세션 상실은 토스트하지 않는다', async () => {
    const handled = handleCodes({ Order_400_22: () => {} });
    await mutate(new ApiError(400, 'Order_400_22', '입금자명'), handled.meta);
    await mutate(new ApiError(400, 'X', 'x'), { handled: true });
    await mutate(new SessionLostError());
    expect(notify).not.toHaveBeenCalled();
    // 맡기지 않은 코드는 그대로 토스트
    await mutate(new ApiError(400, 'Order_400_23', '옵션'), handled.meta);
    expect(notify).toHaveBeenCalledTimes(1);
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
