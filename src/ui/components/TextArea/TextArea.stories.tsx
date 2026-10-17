import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { TextArea } from './TextArea';

const meta = {
  title: 'Components/TextArea',
  component: TextArea,
  args: { label: '티켓 설명', placeholder: '예) 해당 티켓은 후원 티켓으로 입장이 불가합니다.' },
  decorators: [
    (Story) => (
      <div style={{ width: 358 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextArea>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Filled: Story = { args: { defaultValue: '공연 소개\n두 번째 줄' } };
export const Disabled: Story = { args: { disabled: true, defaultValue: '수정할 수 없어요' } };
export const WithError: Story = { args: { error: '설명을 입력해 주세요.' } };

export const Counter: Story = {
  args: { maxLength: 30, helper: '티켓에 대한 추가 정보가 필요한 경우 작성해 주세요.' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const box = c.getByRole('textbox', { name: '티켓 설명' });
    await userEvent.type(box, '줄{Enter}바꿈');
    await expect(box).toHaveValue('줄\n바꿈');
    await expect(c.getByText('4/30')).toBeInTheDocument();
  },
};
