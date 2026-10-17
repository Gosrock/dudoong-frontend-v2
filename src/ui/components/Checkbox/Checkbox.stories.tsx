import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Flex } from '../../primitives/Flex';
import { Checkbox } from './Checkbox';

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  args: { label: '개인정보 수집에 동의합니다', onCheckedChange: fn() },
} satisfies Meta<typeof Checkbox>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Checked: Story = { args: { defaultChecked: true } };
export const Disabled: Story = { args: { disabled: true } };
export const DisabledChecked: Story = { args: { disabled: true, defaultChecked: true } };

/** Figma Box — checked × Status(default/disabled) */
export const Matrix: Story = {
  render: () => (
    <Flex gap={3}>
      <Checkbox aria-label="꺼짐" />
      <Checkbox aria-label="켜짐" defaultChecked />
      <Checkbox aria-label="꺼짐 disabled" disabled />
      <Checkbox aria-label="켜짐 disabled" disabled defaultChecked />
    </Flex>
  ),
};

/** Space로 토글, 글자를 눌러도 토글 */
export const Keyboard: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const box = c.getByRole('checkbox', { name: '개인정보 수집에 동의합니다' });
    await userEvent.tab();
    await expect(box).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(box).toHaveAttribute('aria-checked', 'true');
    await expect(args.onCheckedChange).toHaveBeenLastCalledWith(true);
    await userEvent.click(c.getByText('개인정보 수집에 동의합니다'));
    await expect(box).toHaveAttribute('aria-checked', 'false');
  },
};
