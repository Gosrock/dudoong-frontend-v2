import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider, useSuspenseQuery } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Txt } from '../../primitives/Txt';
import { Button } from '../Button/Button';
import { InlineError } from '../InlineError/InlineError';
import { AsyncBoundary } from './AsyncBoundary';

/** 조회 id별 호출 수 — 경계가 풀리면 다시 마운트되므로 컴포넌트 밖에 둔다 */
const calls = new Map<string, number>();

function WithQueryClient({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    calls.clear();
    return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

class SessionLost extends Error {}

/** `fail`번째 호출까지 실패하고 그 뒤로 성공하는 조회 */
function Section({ id, fail = 0, error }: { id: string; fail?: number; error?: () => Error }) {
  const { data } = useSuspenseQuery({
    queryKey: ['async-story', id],
    queryFn: async () => {
      const n = (calls.get(id) ?? 0) + 1;
      calls.set(id, n);
      await new Promise((r) => setTimeout(r, 150));
      if (n <= fail) throw (error ?? (() => new Error('boom')))();
      return `${id} 내용`;
    },
  });
  return <Txt typography="bodyMd">{data}</Txt>;
}

/**
 * 데이터 경계(patterns §4-3) — `ErrorBoundary` + `Suspense`. `useSuspenseQuery` 화면을 감싼다(화면 19곳).
 * `(public)` 서버 조회 라우트에는 두지 않는다(404 상태 코드). 묶음 재시도·`shouldCatch`는 `Components/ErrorBoundary` 스토리.
 */
const meta = {
  title: 'Components/AsyncBoundary',
  component: AsyncBoundary,
  decorators: [
    (Story) => (
      <WithQueryClient>
        <div style={{ width: 390 }}>
          <Story />
        </div>
      </WithQueryClient>
    ),
  ],
  args: { children: null },
} satisfies Meta<typeof AsyncBoundary>;
export default meta;

type Story = StoryObj<typeof meta>;

/** 기본 — 대기 화면은 `ScreenLoader`, 끝나면 내용 */
export const Default: Story = {
  render: () => (
    <AsyncBoundary>
      <Section id="기본" />
    </AsyncBoundary>
  ),
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('기본 내용')).toBeInTheDocument();
  },
};

/** `pending`·`rejected`를 화면이 정한다 — 실패 자리에 `InlineError` */
export const CustomRejected: Story = {
  render: () => (
    <AsyncBoundary
      pending={<Txt typography="bodyMd">목록 불러오는 중</Txt>}
      rejected={({ reset }) => <InlineError message="목록을 불러오지 못했어요." onRetry={reset} />}
    >
      <Section id="목록" fail={1} />
    </AsyncBoundary>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByRole('alert')).toHaveTextContent('목록을 불러오지 못했어요.');
    await userEvent.click(c.getByRole('button', { name: '다시 시도' }));
    await expect(await c.findByText('목록 내용')).toBeInTheDocument();
  },
};

/** `holdOn` 에러(세션 상실)는 에러 화면 없이 대기 화면을 계속 보인다 — 곧 로그인으로 이동(patterns §5-1) */
export const HoldOnSessionLost: Story = {
  render: () => (
    <AsyncBoundary
      holdOn={(e) => e instanceof SessionLost}
      pending={<Txt typography="bodyMd">확인 중</Txt>}
    >
      <Section id="세션" fail={1} error={() => new SessionLost()} />
    </AsyncBoundary>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await new Promise((r) => setTimeout(r, 400));
    await expect(c.getByText('확인 중')).toBeInTheDocument();
    await expect(c.queryByRole('alert')).toBeNull();
  },
};

function KeyedDemo() {
  const [id, setId] = useState('A');
  return (
    <>
      <Button size="sm" onClick={() => setId('B')}>
        B로
      </Button>
      <AsyncBoundary resetKeys={[id]} rejected={() => <Txt typography="bodyMd">{id} 실패</Txt>}>
        <Section id={id} fail={id === 'A' ? 1 : 0} />
      </AsyncBoundary>
    </>
  );
}

/** `resetKeys`가 바뀌면(경로·id) 에러를 풀고 다시 그린다 */
export const ResetKeys: Story = {
  render: () => <KeyedDemo />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await c.findByText('A 실패');
    await userEvent.click(c.getByRole('button', { name: 'B로' }));
    await expect(await c.findByText('B 내용')).toBeInTheDocument();
  },
};
