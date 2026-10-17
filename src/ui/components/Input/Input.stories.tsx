import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Icon } from '../../icons/Icon';
import { Flex } from '../../primitives/Flex';
import { Input } from './Input';

const meta = {
  title: 'Components/Input',
  component: Input,
  args: { placeholder: 'stakeholder', 'aria-label': '입력' },
  decorators: [
    (Story) => (
      <div style={{ width: 358 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Figma input field — State=Default */
export const Default: Story = {};
/** State=Filled */
export const Filled: Story = { args: { defaultValue: 'stakeholder' } };
/** State=disabled */
export const Disabled: Story = { args: { disabled: true } };
/** Figma text input Field — 단위 접미사 */
export const Unit: Story = {
  args: { placeholder: '0', trailing: '원', inputMode: 'numeric', 'aria-label': '티켓 가격' },
};
/** Figma icon input Field — 앞 아이콘 20 */
export const WithIcon: Story = {
  args: { leading: <Icon name="search" />, placeholder: '주소 입력', 'aria-label': '주소' },
};

/** 없는 상태 — 라벨 · 도움말 · 필수 · 글자 수(GUI `584:4775`) */
export const LabelAndCounter: Story = {
  args: {
    'aria-label': undefined,
    label: '티켓 이름',
    helper: '티켓의 성격이 잘 드러나는 이름을 써주세요.',
    required: true,
    maxLength: 12,
    placeholder: '예) 후원티켓',
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByRole('textbox', { name: '티켓 이름' });
    await expect(input).toHaveAccessibleDescription('티켓의 성격이 잘 드러나는 이름을 써주세요.');
    await expect(c.getByText('0/12')).toBeInTheDocument();
    await userEvent.type(input, '얼리버드');
    await expect(c.getByText('4/12')).toBeInTheDocument();
  },
};

/** 없는 상태 — 에러: 테두리 status/error + 아래 문구 */
export const WithError: Story = {
  args: {
    'aria-label': undefined,
    label: '공연 이름',
    error: '공연 이름을 입력해 주세요.',
  },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('textbox', { name: '공연 이름' });
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAccessibleDescription('공연 이름을 입력해 주세요.');
  },
};

/** Figma 3종 × 상태 비교 */
export const Matrix: Story = {
  render: () => (
    <Flex direction="column" gap={4} fullWidth>
      <Input aria-label="기본" placeholder="stakeholder" />
      <Input aria-label="채움" defaultValue="stakeholder" />
      <Input aria-label="꺼짐" placeholder="stakeholder" disabled />
      <Input aria-label="가격" placeholder="0" trailing="원" />
      <Input aria-label="가격 꺼짐" placeholder="0" trailing="원" disabled />
      <Input aria-label="아이콘" placeholder="stakeholder" leading={<Icon name="blank" />} />
      <Input
        aria-label="아이콘 꺼짐"
        placeholder="stakeholder"
        leading={<Icon name="blank" />}
        disabled
      />
      <Input
        aria-label="에러"
        defaultValue="잘못된 값"
        error="형식이 맞지 않아요."
        maxLength={30}
      />
    </Flex>
  ),
};
