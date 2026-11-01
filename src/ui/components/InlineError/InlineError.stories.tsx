import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { InlineError } from './InlineError';

/**
 * "불러오지 못했어요 + 다시 시도"(A7) — 목록·카드 자리 전체 실패(column)와 표·섹션 아래 한 줄(row).
 * 디자인 없음 — DS(`DefaultErrorFallback`과 같은 글자색·버튼)로만.
 */
const meta = {
  title: 'Components/InlineError',
  component: InlineError,
  args: { onRetry: fn() },
  decorators: [
    (Story) => (
      <div style={{ width: 390 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InlineError>;
export default meta;

type Story = StoryObj<typeof meta>;

/** 기본 — 가운데 세로 배치, [다시 시도]가 onRetry를 부른다 */
export const Column: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('alert')).toHaveTextContent('불러오지 못했어요.');
    await userEvent.click(c.getByRole('button', { name: '다시 시도' }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};

/** 한 줄 — 무엇을 못 불러왔는지 밝힌다(호스팅 표 아래) */
export const Row: Story = {
  args: { layout: 'row', message: '주문 목록을 불러오지 못했어요.' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const text = c.getByText('주문 목록을 불러오지 못했어요.');
    const button = c.getByRole('button', { name: '다시 시도' });
    // 같은 줄(세로 위치가 겹친다)
    const t = text.getBoundingClientRect();
    const b = button.getBoundingClientRect();
    await expect(b.top).toBeLessThan(t.bottom);
    await expect(b.left).toBeGreaterThan(t.right);
  },
};

/** 재시도가 없는 실패 — 문구만 */
export const MessageOnly: Story = {
  args: { onRetry: undefined, message: '연락처를 불러오지 못했어요.' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button')).toBeNull();
  },
};
