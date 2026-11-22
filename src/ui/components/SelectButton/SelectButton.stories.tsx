import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { SelectButton } from './SelectButton';

const yesNo = [
  { value: 'yes', label: '예' },
  { value: 'no', label: '아니오' },
];

const meta = {
  title: 'Components/SelectButton',
  component: SelectButton,
  args: { options: yesNo, 'aria-label': '입금 여부', onValueChange: fn() },
  decorators: [
    (Story) => (
      <div style={{ width: 358 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SelectButton>;
export default meta;

type Story = StoryObj<typeof meta>;

/** GUI Check Button — Default(둘 다 선택 전) */
export const Default: Story = {};
/** state=selected */
export const Selected: Story = { args: { defaultValue: 'yes' } };
/** 결제 방식처럼 3개 이상 */
export const ThreeOptions: Story = {
  args: {
    'aria-label': '결제 방식',
    options: [
      { value: 'transfer', label: '계좌 이체' },
      { value: 'toss', label: '토스 송금' },
      { value: 'onsite', label: '현장 결제', disabled: true },
    ],
    defaultValue: 'transfer',
  },
};
/** 없는 상태 — disabled */
export const Disabled: Story = { args: { defaultValue: 'yes', disabled: true } };

/** 키보드: Tab으로 묶음에 들어가 → 로 이동하며 선택된다 */
export const Keyboard: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('radiogroup', { name: '입금 여부' })).toBeInTheDocument();
    await userEvent.tab();
    const yes = c.getByRole('radio', { name: '예' });
    await expect(yes).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(yes).toHaveAttribute('aria-checked', 'true');
    // Radix는 방향키가 눌린 동안 포커스가 옮겨 간 항목을 선택한다 — 키를 누른 채로 확인하고 뗀다
    await userEvent.keyboard('{ArrowRight>}');
    const no = c.getByRole('radio', { name: '아니오' });
    await expect(no).toHaveFocus();
    await expect(no).toHaveAttribute('aria-checked', 'true');
    await expect(args.onValueChange).toHaveBeenLastCalledWith('no');
    await userEvent.keyboard('{/ArrowRight}');
  },
};

/**
 * 읽기 전용 — 주문상세 옵션 답(GUI `1175:19046`: 고른 것 Default `1175:19192` · 나머지 disabled `1175:19193`, #348 B67).
 * 눌러도 값이 바뀌지 않고 `onValueChange`를 부르지 않는다
 */
export const ReadOnly: Story = {
  args: { value: 'yes', readOnly: true, 'aria-label': '뒤풀이 참석 답' },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const group = c.getByRole('radiogroup', { name: '뒤풀이 참석 답' });
    await expect(group).toHaveAttribute('aria-readonly', 'true');
    const yes = c.getByRole('radio', { name: '예' });
    const no = c.getByRole('radio', { name: '아니오' });
    await expect(yes).toHaveAttribute('aria-checked', 'true');
    await expect(no).toBeDisabled();
    await userEvent.click(yes);
    await expect(args.onValueChange).not.toHaveBeenCalled();
    // 고른 버튼도 Default 모양(보라 테두리가 아니다)
    await expect(getComputedStyle(yes).borderColor).not.toBe('rgb(99, 62, 231)');
  },
};
