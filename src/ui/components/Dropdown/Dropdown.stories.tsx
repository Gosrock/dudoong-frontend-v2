import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test';

import { Flex } from '../../primitives/Flex';
import { Dropdown } from './Dropdown';

const contactOptions = [
  { value: 'email', label: '이메일' },
  { value: 'phone', label: '전화번호' },
  { value: 'instagram', label: '인스타그램' },
  { value: 'kakao', label: '오픈채팅' },
  { value: 'etc', label: '기타', disabled: true },
];

const meta = {
  title: 'Components/Dropdown',
  component: Dropdown,
  args: { options: contactOptions, 'aria-label': '연락처 종류', onValueChange: fn() },
  decorators: [
    (Story) => (
      <div style={{ width: 160, minHeight: 240 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Dropdown>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Figma dropdown 트리거 — 값이 있는 상태 */
export const Default: Story = { args: { defaultValue: 'email' } };
/** 없는 상태 — placeholder */
export const Placeholder: Story = { args: { placeholder: '선택' } };
/** 없는 상태 — disabled */
export const Disabled: Story = { args: { defaultValue: 'email', disabled: true } };
/** 없는 상태 — 에러 */
export const WithError: Story = {
  args: {
    placeholder: '선택',
    error: '연락처 종류를 골라 주세요.',
    'aria-label': undefined,
    label: '문의처',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 240 }}>
        <Story />
      </div>
    ),
  ],
};
/** 열린 목록 — selected · hover(키보드 하이라이트) · disabled item */
export const Open: Story = { args: { defaultValue: 'phone', defaultOpen: true } };

/** 키보드: Enter로 열고 ↓로 이동, Enter로 선택. disabled 항목은 건너뛴다. Esc로 닫힌다 */
export const Keyboard: Story = {
  args: { placeholder: '선택' },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const trigger = c.getByRole('combobox', { name: '연락처 종류' });
    await expect(trigger).toHaveTextContent('선택');
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    const listbox = await screen.findByRole('listbox');
    await expect(within(listbox).getByRole('option', { name: '기타' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    await expect(args.onValueChange).toHaveBeenCalledWith('phone');
    await expect(trigger).toHaveTextContent('전화번호');
    await expect(trigger).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    await screen.findByRole('listbox');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    await expect(trigger).toHaveTextContent('전화번호');
  },
};

function Controlled() {
  const [v, setV] = useState('');
  return (
    <Flex direction="column" gap={2}>
      <Dropdown
        aria-label="연락처 종류"
        placeholder="선택"
        options={contactOptions}
        value={v}
        onValueChange={setV}
      />
      <button type="button" onClick={() => setV('')}>
        초기화
      </button>
    </Flex>
  );
}

/** 제어형 — value를 ''로 되돌리면 placeholder가 다시 보인다 */
export const ControlledReset: Story = {
  render: () => <Controlled />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const trigger = c.getByRole('combobox', { name: '연락처 종류' });
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole('option', { name: '인스타그램' }));
    await expect(trigger).toHaveTextContent('인스타그램');
    await userEvent.click(c.getByRole('button', { name: '초기화' }));
    await expect(trigger).toHaveTextContent('선택');
  },
};
