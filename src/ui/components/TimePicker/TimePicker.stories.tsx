import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { TimePicker } from './TimePicker';

const meta = {
  title: 'Components/TimePicker',
  component: TimePicker,
  args: { 'aria-label': '시작 시간', placeholder: '시작 시간', onChange: fn() },
  decorators: [
    (Story) => (
      <div style={{ width: 160 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TimePicker>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Filled: Story = { args: { defaultValue: '18:00' } };
export const Disabled: Story = { args: { disabled: true, defaultValue: '18:00' } };
export const WithError: Story = { args: { error: '시간을 골라 주세요.' } };

/** 값은 'HH:mm' 문자열 */
export const TypeValue: Story = {
  play: async ({ canvasElement, args }) => {
    const input = within(canvasElement).getByLabelText('시작 시간');
    await expect(input).toHaveAttribute('type', 'time');
    await userEvent.type(input, '18:30');
    await expect(input).toHaveValue('18:30');
    await expect(args.onChange).toHaveBeenCalled();
  },
};
