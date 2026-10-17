import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Flex } from '../../primitives/Flex';
import { Radio, RadioGroup } from './Radio';

const meta = {
  title: 'Components/Radio',
  component: RadioGroup,
  args: { 'aria-label': '티켓 종류', onValueChange: fn() },
  render: (args) => (
    <RadioGroup {...args}>
      <Radio value="paid" label="티켓 있음" />
      <Radio value="free" label="티켓 없음" />
    </RadioGroup>
  ),
} satisfies Meta<typeof RadioGroup>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { defaultValue: 'paid' } };
export const Vertical: Story = { args: { defaultValue: 'paid', orientation: 'vertical' } };
/** 없는 상태 — disabled */
export const Disabled: Story = { args: { defaultValue: 'paid', disabled: true } };

/** Figma Radio — selected true/false (+ disabled) */
export const Matrix: Story = {
  render: () => (
    <Flex direction="column" gap={3}>
      <RadioGroup aria-label="기본" defaultValue="a">
        <Radio value="a" aria-label="선택" />
        <Radio value="b" aria-label="미선택" />
      </RadioGroup>
      <RadioGroup aria-label="꺼짐" defaultValue="a" disabled>
        <Radio value="a" aria-label="선택 꺼짐" />
        <Radio value="b" aria-label="미선택 꺼짐" />
      </RadioGroup>
    </Flex>
  ),
};

/** Tab으로 선택된 항목에 들어가고 방향키로 이동하며 선택 */
export const Keyboard: Story = {
  args: { defaultValue: 'paid' },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('radiogroup', { name: '티켓 종류' })).toBeInTheDocument();
    await userEvent.tab();
    const paid = c.getByRole('radio', { name: '티켓 있음' });
    const free = c.getByRole('radio', { name: '티켓 없음' });
    await expect(paid).toHaveFocus();
    // Radix는 방향키가 눌린 동안 포커스가 옮겨 간 항목을 선택한다 — 키를 누른 채로 확인하고 뗀다
    await userEvent.keyboard('{ArrowDown>}');
    await expect(free).toHaveFocus();
    await expect(free).toHaveAttribute('aria-checked', 'true');
    await expect(args.onValueChange).toHaveBeenLastCalledWith('free');
    await userEvent.keyboard('{/ArrowDown}');
    await userEvent.click(c.getByText('티켓 있음'));
    await expect(paid).toHaveAttribute('aria-checked', 'true');
  },
};
