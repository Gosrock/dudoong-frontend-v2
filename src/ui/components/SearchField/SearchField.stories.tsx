import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { SearchField } from './SearchField';

const meta = {
  title: 'Components/SearchField',
  component: SearchField,
  args: { placeholder: '검색어를 입력해주세요', 'aria-label': '공연 검색' },
  decorators: [
    (Story) => (
      <div style={{ width: 358 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SearchField>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Figma Search Field — State=Default (Focus는 칸을 눌러 본다) */
export const Default: Story = {};
/** State=Filled — 값이 있으면 지우기 버튼 */
export const Filled: Story = { args: { defaultValue: '고스락' } };
/** 없는 상태 — disabled */
export const Disabled: Story = { args: { disabled: true, defaultValue: '고스락' } };

/** 비제어(register와 같은 방식)에서 지우기 — 값이 비고 onChange가 불리고 포커스가 칸으로 돌아간다 */
export const ClearUncontrolled: Story = {
  args: { onChange: fn(), onClear: fn() },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const input = c.getByRole('searchbox', { name: '공연 검색' });
    await expect(c.queryByRole('button', { name: '검색어 지우기' })).toBeNull();
    await userEvent.type(input, '밴드');
    const clear = c.getByRole('button', { name: '검색어 지우기' });
    await userEvent.click(clear);
    await expect(input).toHaveValue('');
    await expect(input).toHaveFocus();
    await expect(args.onClear).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ target: input }),
    );
    await expect(c.queryByRole('button', { name: '검색어 지우기' })).toBeNull();
  },
};

function Controlled() {
  const [q, setQ] = useState('인디');
  return (
    <>
      <SearchField
        aria-label="공연 검색"
        placeholder="검색어를 입력해주세요"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <output data-testid="q">{q}</output>
    </>
  );
}

/** 제어형에서 지우기 — 부모 상태도 ''가 된다 */
export const ClearControlled: Story = {
  render: () => <Controlled />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: '검색어 지우기' }));
    await expect(c.getByRole('searchbox')).toHaveValue('');
    await expect(c.getByTestId('q')).toHaveTextContent('');
  },
};
