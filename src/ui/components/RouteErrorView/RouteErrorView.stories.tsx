import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { RouteErrorView } from './RouteErrorView';

/** 라우트 에러 경계 공용 화면 — 호스팅 `error.tsx`·루트 `global-error.tsx`(디자인 없음, EmptyState 배치) */
const meta = {
  title: 'Components/RouteErrorView',
  component: RouteErrorView,
  args: { retry: fn() },
  decorators: [
    (Story) => (
      <div style={{ width: 390 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RouteErrorView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByText('화면을 불러오지 못했어요')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: '다시 시도' }));
    await expect(args.retry).toHaveBeenCalledOnce();
  },
};
