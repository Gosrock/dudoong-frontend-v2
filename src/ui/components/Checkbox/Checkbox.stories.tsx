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

/** Figma Box — checked × Status(default/disabled) × type(round/square, 2026-11-01) */
export const Matrix: Story = {
  render: () => (
    <Flex direction="column" gap={3}>
      {(['round', 'square'] as const).map((shape) => (
        <Flex key={shape} gap={3}>
          <Checkbox shape={shape} aria-label={`${shape} 꺼짐`} />
          <Checkbox shape={shape} aria-label={`${shape} 켜짐`} defaultChecked />
          <Checkbox shape={shape} aria-label={`${shape} 꺼짐 disabled`} disabled />
          <Checkbox shape={shape} aria-label={`${shape} 켜짐 disabled`} disabled defaultChecked />
        </Flex>
      ))}
    </Flex>
  ),
};

/** Figma `type=square`(모서리 4) */
export const Square: Story = { args: { shape: 'square', defaultChecked: true } };

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
