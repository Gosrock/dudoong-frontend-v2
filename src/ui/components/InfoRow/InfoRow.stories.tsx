import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { Checkbox } from '../Checkbox/Checkbox';
import { Chip } from '../Chip/Chip';
import { InfoRow } from './InfoRow';

const meta = {
  title: 'Components/InfoRow',
  component: InfoRow,
  args: { label: 'label text' },
  decorators: [
    (Story) => (
      <div style={{ width: 390 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InfoRow>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `Hierarchy=First, value type=no` */
export const FirstNoValue: Story = { args: { hierarchy: 'first' } };
/** Figma `Hierarchy=First, value type=text` */
export const FirstText: Story = { args: { hierarchy: 'first', value: 'value' } };
/** Figma `Hierarchy=second-radio` — 이름과 달리 체크박스(design-system §3) */
export const SecondCheckbox: Story = {
  args: {
    hierarchy: 'second',
    value: <Checkbox defaultChecked aria-label="label text 선택" />,
  },
};
/** Figma `Hierarchy=third, value type=text` */
export const ThirdText: Story = { args: { hierarchy: 'third', value: 'value' } };
/** Figma `Hierarchy=third, value type=badge` */
export const ThirdBadge: Story = {
  args: {
    hierarchy: 'third',
    value: <Chip color="violet">승인완료</Chip>,
  },
};

/** Figma `Hierarchy=third, value type=account` — 복사 버튼은 클립보드 유틸 `copyText` + 성공 콜백 */
export const ThirdAccount: Story = {
  args: {
    hierarchy: 'third',
    label: '입금 계좌',
    account: { number: '3333-20-4299811', onCopied: fn(), onCopyError: fn() },
  },
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button', { name: '계좌번호 복사' });
    button.focus();
    await userEvent.keyboard('{Enter}');
    // 브라우저 권한에 따라 성공 또는 실패 콜백 중 하나가 불린다
    await waitFor(() => {
      const calls =
        (args.account?.onCopied as ReturnType<typeof fn>).mock.calls.length +
        (args.account?.onCopyError as ReturnType<typeof fn>).mock.calls.length;
      return expect(calls).toBe(1);
    });
  },
};

/** 긴 값은 줄바꿈 */
export const LongValue: Story = {
  args: {
    hierarchy: 'third',
    label: '장소',
    value: '서울특별시 마포구 와우산로 94 홍익대학교 학생회관 3층 소극장',
  },
};

/** second-open·second-closed(펼침형)는 `Components/Accordion` */
export const AllInOneList: Story = {
  render: () => (
    <div>
      <InfoRow hierarchy="first" label="예매 정보" />
      <InfoRow hierarchy="first" label="결제 금액" value="12,000원" />
      <InfoRow hierarchy="second" label="환불 동의" value={<Checkbox aria-label="환불 동의" />} />
      <InfoRow hierarchy="third" label="예매자" value="김두둥" />
      <InfoRow hierarchy="third" label="상태" value={<Chip>승인대기</Chip>} />
      <InfoRow hierarchy="third" label="입금 계좌" account={{ number: '3333-20-4299811' }} />
    </div>
  ),
};
