import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Flex } from '../../primitives/Flex';
import { TagButton, TagButtonGroup } from './TagButton';

const tags = [
  '정기공연',
  '연합공연',
  '시리즈',
  '단독공연',
  '홍대',
  '합정',
  '신촌',
  '대학교',
  '콘서트',
  '인디밴드',
  '라이브',
  '페스티벌',
].map((t) => ({ value: t, label: t }));

const meta = {
  title: 'Components/TagButton',
  component: TagButtonGroup,
  args: { options: tags, value: [], onChange: () => {}, columns: 4, 'aria-label': '태그' },
  render: function Render(args) {
    const [v, setV] = useState(args.value);
    return (
      <div style={{ width: 342 }}>
        <TagButtonGroup {...args} value={v} onChange={setV} />
      </div>
    );
  },
} satisfies Meta<typeof TagButtonGroup>;
export default meta;

type Story = StoryObj<typeof meta>;

/** GUI `329:7170` — 4열, 선택은 검정 채움 */
export const Group: Story = { args: { value: ['연합공연', '대학교'] } };
/** 열 수 없이 글자 길이대로 */
export const Wrap: Story = { args: { columns: undefined } };
export const Disabled: Story = { args: { disabled: true, value: ['홍대'] } };

/** 칩 하나 — 선택 · 미선택 · disabled */
export const Single: Story = {
  render: () => (
    <Flex gap={2}>
      <TagButton selected={false}>정기공연</TagButton>
      <TagButton selected>연합공연</TagButton>
      <TagButton selected={false} disabled>
        시리즈
      </TagButton>
    </Flex>
  ),
};

/** 최대 2개 — 다 고르면 나머지는 aria-disabled(포커스는 남는다). 값은 options 순서 */
export const Max: Story = {
  args: { max: 2 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('group', { name: '태그' })).toBeInTheDocument();
    const hongdae = c.getByRole('button', { name: '홍대' });
    const regular = c.getByRole('button', { name: '정기공연' });
    const series = c.getByRole('button', { name: '시리즈' });
    await userEvent.click(hongdae);
    await expect(hongdae).toHaveAttribute('aria-pressed', 'true');
    regular.focus();
    await userEvent.keyboard(' ');
    await expect(regular).toHaveAttribute('aria-pressed', 'true');
    await expect(series).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(series);
    await expect(series).toHaveAttribute('aria-pressed', 'false');
    regular.focus();
    await userEvent.keyboard('{Enter}');
    await expect(regular).toHaveAttribute('aria-pressed', 'false');
    await expect(series).not.toHaveAttribute('aria-disabled');
  },
};
