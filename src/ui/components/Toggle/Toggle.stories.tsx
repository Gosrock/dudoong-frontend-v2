import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Flex } from '../../primitives/Flex';
import { Toggle } from './Toggle';

const meta = {
  title: 'Components/Toggle',
  component: Toggle,
  args: { 'aria-label': '재고 정보 공개', onCheckedChange: fn() },
} satisfies Meta<typeof Toggle>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Figma State=Off, disabled?=false */
export const Off: Story = {};
/** Figma State=On, disabled?=false */
export const On: Story = { args: { defaultChecked: true } };
/** Figma `disabled?=true`(2026-11-01) — 꺼짐 Neutral 200 · 켜짐 Violet 100 */
export const Disabled: Story = {
  render: (args) => (
    <Flex gap={3}>
      <Toggle {...args} aria-label="꺼짐 disabled" disabled />
      <Toggle {...args} aria-label="켜짐 disabled" disabled defaultChecked />
    </Flex>
  ),
};

/** 제목과 aria-labelledby로 묶은 행. Space·Enter로 토글 */
export const Keyboard: Story = {
  args: { 'aria-label': undefined, 'aria-labelledby': 'stock-title' },
  render: (args) => (
    <Flex justify="space-between" align="center" style={{ width: 342 }}>
      <span id="stock-title">재고 정보 공개</span>
      <Toggle {...args} />
    </Flex>
  ),
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const sw = c.getByRole('switch', { name: '재고 정보 공개' });
    await userEvent.tab();
    await expect(sw).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(sw).toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard('{Enter}');
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    await expect(args.onCheckedChange).toHaveBeenLastCalledWith(false);
  },
};
