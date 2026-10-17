import * as Popover from '@radix-ui/react-popover';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Flex } from '../../primitives/Flex';
import { Txt } from '../../primitives/Txt';
import { FilterChip } from './FilterChip';

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
