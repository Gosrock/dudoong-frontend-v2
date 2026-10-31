import { useSuspenseQuery } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/render';

import { AsyncBoundary } from './AsyncBoundary';

class IgnoredError extends Error {}

function Data({ fetcher }: { fetcher: () => Promise<string> }) {
  const { data } = useSuspenseQuery({ queryKey: ['data'], queryFn: fetcher });
  return <p>값: {data}</p>;
}

describe('AsyncBoundary', () => {
  // 에러 경계가 잡은 에러를 React가 console.error로 다시 찍는다 — 테스트 출력만 조용히
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('대기 중에는 pending, 끝나면 children', async () => {
    renderWithProviders(
      <AsyncBoundary pending={<p>로딩</p>}>
        <Data fetcher={async () => 'ok'} />
      </AsyncBoundary>,
    );
    expect(screen.getByText('로딩')).toBeInTheDocument();
    expect(await screen.findByText('값: ok')).toBeInTheDocument();
  });

  it('에러면 기본 rejected를 그리고, [다시 시도]가 쿼리 에러를 풀고 다시 조회한다', async () => {
    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('두 번째');
    const { user } = renderWithProviders(
      <AsyncBoundary>
        <Data fetcher={fetcher} />
      </AsyncBoundary>,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('불러오지 못했어요');
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('값: 두 번째')).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('rejected를 넘기면 error와 reset을 받는다', async () => {
    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('사용자 정의'))
      .mockResolvedValueOnce('복구');
    const { user } = renderWithProviders(
      <AsyncBoundary
        rejected={({ error, reset }) => (
          <button type="button" onClick={reset}>
            {(error as Error).message} 재시도
          </button>
        )}
      >
        <Data fetcher={fetcher} />
      </AsyncBoundary>,
    );
    await user.click(await screen.findByRole('button', { name: '사용자 정의 재시도' }));
    expect(await screen.findByText('값: 복구')).toBeInTheDocument();
  });

  it('holdOn이 true인 에러는 에러 화면 없이 pending을 유지한다(SessionLostError — 곧 이동)', async () => {
    const fetcher = vi.fn<() => Promise<string>>().mockRejectedValue(new IgnoredError('세션 상실'));
    renderWithProviders(
      <AsyncBoundary pending={<p>로딩</p>} holdOn={(e) => e instanceof IgnoredError}>
        <Data fetcher={fetcher} />
      </AsyncBoundary>,
    );
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    // 에러가 경계에 닿은 뒤에도 같은 대기 화면이고 재시도 UI가 없다
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText('로딩')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('resetKeys가 바뀌면 에러 상태를 풀고 다시 그린다', async () => {
    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('새 경로');
    const { rerender } = renderWithProviders(
      <AsyncBoundary resetKeys={['/a']}>
        <Data fetcher={fetcher} />
      </AsyncBoundary>,
    );
    await screen.findByRole('alert');
    rerender(
      <AsyncBoundary resetKeys={['/b']}>
        <Data fetcher={fetcher} />
      </AsyncBoundary>,
    );
    expect(await screen.findByText('값: 새 경로')).toBeInTheDocument();
  });
});
