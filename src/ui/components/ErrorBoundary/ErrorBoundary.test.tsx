import { useSuspenseQuery } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/render';

import { ErrorBoundary, ErrorBoundaryGroup, useErrorBoundaryGroup } from './ErrorBoundary';

class ScreenError extends Error {}
class HoldError extends Error {}

function Data({ id, fetcher }: { id: string; fetcher: () => Promise<string> }) {
  const { data } = useSuspenseQuery({ queryKey: ['data', id], queryFn: fetcher });
  return <p>{data}</p>;
}

function ResetAll() {
  const group = useErrorBoundaryGroup();
  return (
    <button type="button" onClick={group.reset}>
      모두 다시 시도
    </button>
  );
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shouldCatch가 false인 에러는 부모 경계로 올라가고, 맞는 에러는 지역 fallback', async () => {
    const outer = vi.fn(() => <p>화면 전체</p>);
    renderWithProviders(
      <ErrorBoundary fallback={outer}>
        <ErrorBoundary shouldCatch={(e) => !(e instanceof ScreenError)}>
          <Suspense fallback="로딩">
            <Data id="screen" fetcher={() => Promise.reject(new ScreenError('403'))} />
          </Suspense>
        </ErrorBoundary>
        <ErrorBoundary shouldCatch={(e) => !(e instanceof ScreenError)}>
          <Suspense fallback="로딩">
            <Data id="local" fetcher={() => Promise.reject(new Error('500'))} />
          </Suspense>
        </ErrorBoundary>
      </ErrorBoundary>,
    );
    expect(await screen.findByText('화면 전체')).toBeInTheDocument();
    expect(outer).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(ScreenError) }));
  });

  it('holdOn 에러는 shouldCatch와 상관없이 잡고 holdFallback만 보인다(재시도 UI 없음)', async () => {
    renderWithProviders(
      <ErrorBoundary
        shouldCatch={() => false}
        holdOn={(e) => e instanceof HoldError}
        holdFallback={<p>이동 중</p>}
      >
        <Suspense fallback="로딩">
          <Data id="hold" fetcher={() => Promise.reject(new HoldError())} />
        </Suspense>
      </ErrorBoundary>,
    );
    expect(await screen.findByText('이동 중')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('ErrorBoundaryGroup의 reset은 안의 모든 경계를 풀고 실패한 쿼리를 다시 조회한다', async () => {
    const a = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('a'))
      .mockResolvedValue('A 복구');
    const b = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('b'))
      .mockResolvedValue('B 복구');
    const { user } = renderWithProviders(
      <ErrorBoundaryGroup>
        <ResetAll />
        <ErrorBoundary fallback={() => <p>A 실패</p>}>
          <Suspense fallback="로딩">
            <Data id="a" fetcher={a} />
          </Suspense>
        </ErrorBoundary>
        <ErrorBoundary fallback={() => <p>B 실패</p>}>
          <Suspense fallback="로딩">
            <Data id="b" fetcher={b} />
          </Suspense>
        </ErrorBoundary>
      </ErrorBoundaryGroup>,
    );
    await screen.findByText('A 실패');
    await screen.findByText('B 실패');
    await user.click(screen.getByRole('button', { name: '모두 다시 시도' }));
    expect(await screen.findByText('A 복구')).toBeInTheDocument();
    expect(await screen.findByText('B 복구')).toBeInTheDocument();
  });

  it('onReset은 재시도 때 불린다', async () => {
    const onReset = vi.fn();
    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('x'))
      .mockResolvedValue('ok');
    const { user } = renderWithProviders(
      <ErrorBoundary onReset={onReset}>
        <Suspense fallback="로딩">
          <Data id="r" fetcher={fetcher} />
        </Suspense>
      </ErrorBoundary>,
    );
    await user.click(await screen.findByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('ok')).toBeInTheDocument();
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
