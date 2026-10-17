import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { ForbiddenView } from './ForbiddenView';

const meta = { title: 'Components/ForbiddenView', component: ForbiddenView } satisfies Meta<
  typeof ForbiddenView
>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('권한이 없어요')).toBeVisible();
    await expect(c.getByRole('link', { name: '홈으로' })).toHaveAttribute('href', '/');
  },
};

export const Hosting: Story = { args: { href: '/hosting', actionLabel: '호스팅 센터로' } };
