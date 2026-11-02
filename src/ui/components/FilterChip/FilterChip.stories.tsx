import * as Popover from '@radix-ui/react-popover';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Flex } from '../../primitives/Flex';
import { Txt } from '../../primitives/Txt';
import { CountFilterChip, FilterChip } from './FilterChip';

const meta = {
  title: 'Components/FilterChip',
  component: FilterChip,
  args: { label: '태그' },
} satisfies Meta<typeof FilterChip>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Figma 4상태: closed · open · selected/closed · selected/open */
export const FigmaVariants: Story = {
  render: (args) => (
    <Flex gap={5} align="center" padding={4}>
      <FilterChip {...args} open={false} />
      <FilterChip {...args} open />
      <FilterChip {...args} count={3} open={false} />
      <FilterChip {...args} count={3} open />
    </Flex>
  ),
};

export const Disabled: Story = { args: { disabled: true } };

/** Radix Popover와 `asChild`로 조합 — 열림 표시(aria-expanded)를 Radix가 넣는다 */
export const WithPopover: Story = {
  args: { count: 2 },
  render: (args) => (
    <Flex padding={4}>
      <Popover.Root>
        <Popover.Trigger asChild>
          <FilterChip {...args} />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content sideOffset={8} aria-label="태그 고르기">
            <Txt typography="bodyMd">태그 패널</Txt>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chip = canvas.getByRole('button', { name: /태그.*2개 선택됨/ });
    await expect(chip).toHaveAttribute('aria-expanded', 'false');

    chip.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(chip).toHaveAttribute('aria-expanded', 'true'));

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(chip).toHaveAttribute('aria-expanded', 'false'));
    await expect(chip).toHaveFocus();
  },
};

/** 개수형(#61 — `selected/number` · `deselected/number`). 0·null이면 숫자 없음 */
export const CountVariants: Story = {
  render: () => (
    <Flex gap={2} align="center" padding={4}>
      <CountFilterChip label="전체" count={6} selected />
      <CountFilterChip label="승인 대기" count={2} selected={false} />
      <CountFilterChip label="승인 완료" count={0} selected={false} />
      <CountFilterChip label="환불 요청" count={null} selected={false} />
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: '전체 6' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByRole('button', { name: '승인 완료' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  },
};
