import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Flex } from '../../primitives/Flex';
import { Badge } from './Badge';

const meta = {
  title: 'Components/Badge',
  component: Badge,
  args: { count: 3 },
} satisfies Meta<typeof Badge>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Figma size=large */
export const Large: Story = {};
/** Figma size=small */
export const Small: Story = { args: { size: 'small' } };

/** Figma에 없는 상태 — 두 자리 이상은 폭을 늘리고, 99를 넘으면 99+ */
export const Counts: Story = {
  render: () => (
    <Flex gap={3} align="center">
      <Badge count={3} />
      <Badge count={12} />
      <Badge count={99} />
      <Badge count={120} />
      <Badge count={1200} max={999} />
      <Badge size="small" />
    </Flex>
  ),
};

export const WithLabel: Story = {
  args: { count: 120, label: '새 알림 120개' },
  play: async ({ canvasElement }) => {
    const badge = within(canvasElement).getByRole('img', { name: '새 알림 120개' });
    await expect(badge).toHaveTextContent('99+');
  },
};
