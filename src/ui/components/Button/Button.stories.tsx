import type { Meta, StoryObj } from '@storybook/react-vite';

import { Flex } from '../../primitives/Flex';
import { Button } from './Button';

const meta = {
  component: Button,
  args: { children: '텍스트' },
} satisfies Meta<typeof Button>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Tonal: Story = { args: { variant: 'tonal', size: 'lg' } };
export const Selected: Story = { args: { variant: 'secondary', selected: true } };
export const Disabled: Story = { args: { disabled: true } };

/** Figma Button 변형 비교용 — 크기 × 종류 */
export const Matrix: Story = {
  render: () => (
    <Flex direction="column" gap={4}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Flex key={size} gap={3} align="center">
          <Button size={size}>텍스트</Button>
          <Button size={size} variant="secondary">
            텍스트
          </Button>
          <Button size={size} variant="tonal">
            텍스트
          </Button>
          <Button size={size} disabled>
            텍스트
          </Button>
        </Flex>
      ))}
    </Flex>
  ),
};
