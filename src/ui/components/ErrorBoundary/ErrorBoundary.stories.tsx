import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider, useSuspenseQuery } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Txt } from '../../primitives/Txt';
import { AsyncBoundary } from '../AsyncBoundary/AsyncBoundary';
import { Button } from '../Button/Button';
import { ErrorBoundary, ErrorBoundaryGroup, useErrorBoundaryGroup } from './ErrorBoundary';

/** 조회 id별 호출 수. 경계가 풀리면 섹션이 다시 마운트되므로 컴포넌트 밖에 둔다 */
const calls = new Map<string, number>();

/** 스토리마다 새 QueryClient(재시도 끔)와 호출 수 — 스토리 사이에 남지 않게 */
function WithQueryClient({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    calls.clear();
    return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

class ScreenLevelError extends Error {}

/** `fail`번째 호출까지 실패하고 그 뒤로 성공하는 조회 */
function Section({ id, fail = 0, error }: { id: string; fail?: number; error?: () => Error }) {
  const { data } = useSuspenseQuery({
    queryKey: ['story', id],
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

function ResetAllButton() {
  const group = useErrorBoundaryGroup();
  return (
    <Button variant="secondary" onClick={group.reset}>
      모두 다시 시도
    </Button>
  );
}

const meta = {
  title: 'Components/ErrorBoundary',
  component: ErrorBoundary,
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
} satisfies Meta<typeof ErrorBoundary>;
export default meta;

type Story = StoryObj<typeof meta>;

/** 정상 — 대기 화면 뒤 내용 */
export const Success: Story = {
  render: () => (
    <AsyncBoundary pending={<Txt typography="bodyMd">불러오는 중</Txt>}>
      <Section id="정상" />
    </AsyncBoundary>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('정상 내용')).toBeInTheDocument();
  },
};

/** 에러 → 기본 지역 fallback. [다시 시도]가 실패한 쿼리를 다시 조회한다 */
export const ErrorAndRetry: Story = {
  render: () => (
    <AsyncBoundary pending={<Txt typography="bodyMd">불러오는 중</Txt>}>
      <Section id="재시도" fail={1} />
    </AsyncBoundary>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('alert')).toHaveTextContent('불러오지 못했어요');
    await userEvent.click(canvas.getByRole('button', { name: '다시 시도' }));
    await expect(await canvas.findByText('재시도 내용')).toBeInTheDocument();
  },
};

/**
 * `shouldCatch`로 거름 — 섹션 경계는 화면 수준 에러(403·404 자리, 여기선 `ScreenLevelError`)를 잡지 않고
 * 라우트 경계(바깥)로 올린다. 다른 섹션의 일반 에러는 그 섹션 자리에서 [다시 시도].
 */
export const ShouldCatchBubbles: Story = {
  render: () => (
    <ErrorBoundary
      fallback={() => <Txt typography="bodyMd">화면 전체 안내(공용 403·404 자리)</Txt>}
    >
      <AsyncBoundary
        shouldCatch={(e) => !(e instanceof ScreenLevelError)}
        pending={<Txt typography="bodyMd">섹션 대기</Txt>}
      >
        <Section id="권한" fail={1} error={() => new ScreenLevelError('403')} />
      </AsyncBoundary>
    </ErrorBoundary>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('화면 전체 안내(공용 403·404 자리)')).toBeInTheDocument();
  },
};

/** 섹션별 지역 fallback + `ErrorBoundaryGroup`으로 한 번에 다시 시도 */
export const GroupReset: Story = {
  render: () => (
    <ErrorBoundaryGroup>
      <ResetAllButton />
      <AsyncBoundary
        pending={<Txt typography="bodyMd">A 대기</Txt>}
        rejected={() => <Txt typography="bodyMd">A 실패</Txt>}
      >
        <Section id="A" fail={1} />
      </AsyncBoundary>
      <AsyncBoundary
        pending={<Txt typography="bodyMd">B 대기</Txt>}
        rejected={() => <Txt typography="bodyMd">B 실패</Txt>}
      >
        <Section id="B" fail={1} />
      </AsyncBoundary>
    </ErrorBoundaryGroup>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText('A 실패');
    await canvas.findByText('B 실패');
    await userEvent.click(canvas.getByRole('button', { name: '모두 다시 시도' }));
    await expect(await canvas.findByText('A 내용')).toBeInTheDocument();
    await expect(await canvas.findByText('B 내용')).toBeInTheDocument();
  },
};
