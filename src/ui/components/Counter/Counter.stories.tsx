import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Flex } from '../../primitives/Flex';
import { Counter, NumberingButton } from './Counter';

const meta = {
  title: 'Components/Counter',
  component: Counter,
  args: { value: 1, onChange: () => {}, min: 1, max: 3, label: '얼리버드 수량' },
  render: function Render(args) {
    const [v, setV] = useState(args.value);
    return <Counter {...args} value={v} onChange={setV} />;
  },
} satisfies Meta<typeof Counter>;
export default meta;

type Story = StoryObj<typeof meta>;

/** GUI 수량 줄 — 1에서 시작(min 1, max 3: 인당 3매 제한) */
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };

/** Figma numbering — minus/plus × default/pressed(누르고 있으면 pressed) · disabled */
export const Numbering: Story = {
  render: () => (
    <Flex gap={3} align="center">
      <NumberingButton icon="minus" aria-label="빼기" />
      <NumberingButton icon="plus" aria-label="더하기" />
      <NumberingButton icon="minus" aria-label="빼기 꺼짐" disabled />
      <NumberingButton icon="plus" aria-label="더하기 꺼짐" disabled />
    </Flex>
  ),
};

/** min·max에서 버튼이 비활성된다. 키보드(Tab · Enter · Space)로 조작 */
export const Bounds: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('group', { name: '얼리버드 수량' })).toBeInTheDocument();
    const minus = c.getByRole('button', { name: '얼리버드 수량 줄이기' });
    const plus = c.getByRole('button', { name: '얼리버드 수량 늘리기' });
    const out = c.getByRole('status');
    await expect(minus).toBeDisabled();
    await userEvent.tab();
    await expect(plus).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(out).toHaveTextContent('2');
    await userEvent.keyboard(' ');
    await expect(out).toHaveTextContent('3');
    await expect(plus).toBeDisabled();
    await userEvent.click(minus);
    await expect(out).toHaveTextContent('2');
  },
};
