import type { Meta, StoryObj } from '@storybook/react-vite';

import { Flex } from '../../primitives/Flex';
import { Txt } from '../../primitives/Txt';
import { Avatar, type AvatarColor } from './Avatar';

const meta = {
  title: 'Components/Avatar',
  component: Avatar,
  args: { size: 32, color: 'grey' },
  argTypes: {
    color: { control: 'inline-radio', options: ['teal', 'orange', 'indigo', 'grey'] },
  },
} satisfies Meta<typeof Avatar>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const colors: AvatarColor[] = ['grey', 'teal', 'orange', 'indigo'];

/** Figma 9개 변형: 24(grey만) · 32 · "40"(실제 45) × 4색, 그리고 호스트 행의 60 */
export const Matrix: Story = {
  render: () => (
    <Flex direction="column" gap={4}>
      <Flex gap={3} align="center">
        <Txt typography="labelSm">24</Txt>
        <Avatar size={24} color="grey" />
      </Flex>
      {[32, 45, 60].map((size) => (
        <Flex key={size} gap={3} align="center">
          <Txt typography="labelSm">{size}</Txt>
          {colors.map((c) => (
            <Avatar key={c} size={size} color={c} />
          ))}
        </Flex>
      ))}
    </Flex>
  ),
};

/** 프로필 사진(Figma에 없음 — 원형 크롭으로 임시) */
export const Photo: Story = {
  args: {
    size: 60,
    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="%23a3c4f3"/><circle cx="60" cy="40" r="24" fill="%23fff"/></svg>',
    alt: '김두둥 프로필',
  },
};
