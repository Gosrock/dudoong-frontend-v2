import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { NotFoundView } from './NotFoundView';

const meta = { title: 'Components/NotFoundView', component: NotFoundView } satisfies Meta<
  typeof NotFoundView
>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('찾을 수 없어요')).toBeVisible();
    await expect(c.getByRole('link', { name: '홈으로' })).toHaveAttribute('href', '/');
  },
};

/** 공연준비(`/hosting`) — 공연준비 홈으로 */
export const Hosting: Story = { args: { href: '/hosting', actionLabel: '공연준비 홈으로' } };
