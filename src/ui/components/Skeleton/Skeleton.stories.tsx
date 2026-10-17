import type { Meta, StoryObj } from '@storybook/react-vite';

import { Flex } from '../../primitives/Flex';
import { Skeleton, SkeletonText } from './Skeleton';

const meta = {
  title: 'Components/Skeleton',
  component: Skeleton,
  decorators: [
    (Story) => (
      <div style={{ width: 342 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Skeleton>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Block: Story = { args: { shape: 'block', height: 120 } };
export const Text: Story = { render: () => <SkeletonText lines={3} /> };
export const Circle: Story = { args: { shape: 'circle', height: 45 } };

/** 공연 카드 자리표시 예 — 포스터 + 제목 2줄 + 날짜 */
export const ConcertCard: Story = {
  render: () => (
    <Flex direction="column" gap={2} style={{ width: 165 }}>
      <Skeleton height={233} />
      <SkeletonText lines={2} lineHeight={18} />
      <Skeleton shape="text" width={80} height={13} />
    </Flex>
  ),
};
