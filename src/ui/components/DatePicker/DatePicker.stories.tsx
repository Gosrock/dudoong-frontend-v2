import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { DatePicker } from './DatePicker';

const meta = {
  title: 'Components/DatePicker',
  component: DatePicker,
  args: { 'aria-label': '공연 날짜', placeholder: '날짜 선택', onChange: fn() },
  decorators: [
    (Story) => (
      <div style={{ width: 342 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DatePicker>;
export default meta;

type Story = StoryObj<typeof meta>;

/** GUI 공연 일정 — 비어 있으면 "날짜 선택" */
export const Empty: Story = {};
export const Filled: Story = { args: { defaultValue: '2026-05-16' } };
export const Disabled: Story = { args: { disabled: true, defaultValue: '2026-05-16' } };
export const WithError: Story = {
  args: {
    'aria-label': undefined,
    label: '공연 일정',
    required: true,
    error: '날짜를 골라 주세요.',
  },
};
export const MinMax: Story = { args: { min: '2026-10-17', max: '2026-12-31' } };

/** 값은 'yyyy-MM-dd' 문자열. 키보드로 입력하면 placeholder가 사라진다 */
export const TypeValue: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const input = c.getByLabelText('공연 날짜');
    await expect(input).toHaveAttribute('type', 'date');
    await expect(c.getByText('날짜 선택')).toBeInTheDocument();
    await userEvent.type(input, '2026-05-16');
    await expect(input).toHaveValue('2026-05-16');
    await expect(args.onChange).toHaveBeenCalled();
    await expect(c.queryByText('날짜 선택')).toBeNull();
  },
};
