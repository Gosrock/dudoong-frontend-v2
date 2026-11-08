import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test';

import { Icon } from '../../icons/Icon';
import { DropdownMenu } from './DropdownMenu';

const onEdit = fn();
const onStop = fn();
const onDelete = fn();

const meta = {
  title: 'Components/DropdownMenu',
  component: DropdownMenu,
  args: {
    trigger: (
      <button type="button" aria-label="더보기" style={{ border: 0, background: 'none' }}>
        <Icon name="more" />
      </button>
    ),
    items: [
      { label: '수정', onSelect: onEdit },
      { label: '판매 중단', onSelect: onStop },
      { label: '삭제', onSelect: onDelete, danger: true, disabled: true },
    ],
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 40, display: 'flex', justifyContent: 'flex-end', width: 240 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DropdownMenu>;
export default meta;

type Story = StoryObj<typeof meta>;

/** ⋮ 메뉴 — Enter로 열고 ↓로 이동(disabled 건너뜀), Enter로 선택, Esc로 닫고 트리거로 포커스 복귀 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: '더보기' });
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    const menu = await screen.findByRole('menu');
    await expect(within(menu).getByRole('menuitem', { name: '삭제' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await waitFor(() => expect(within(menu).getByRole('menuitem', { name: '수정' })).toHaveFocus());
    await userEvent.keyboard('{ArrowDown}');
    await expect(within(menu).getByRole('menuitem', { name: '판매 중단' })).toHaveFocus();
    // 다음은 disabled '삭제'라 건너뛰고 제자리(loop 없음)
    await userEvent.keyboard('{ArrowDown}');
    await expect(within(menu).getByRole('menuitem', { name: '판매 중단' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    await expect(onStop).toHaveBeenCalled();

    await userEvent.keyboard('{Enter}');
    await screen.findByRole('menu');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    await expect(trigger).toHaveFocus();
  },
};

/** 삭제 가능(위험 색) */
export const Danger: Story = {
  args: {
    items: [
      { label: '수정', onSelect: fn() },
      { label: '삭제', onSelect: fn(), danger: true },
    ],
  },
};

/** `variant="card"` — 상세 정보 탭 메뉴(GUI `1318:385`): 200 · 모서리 12 · 그림자 · 항목 37h `Label/lg` · 항목 사이 구분선 */
export const Card: Story = {
  args: {
    variant: 'card',
    align: 'start',
    items: [
      {
        label: '이름 바꾸기',
        icon: <Icon name="edit-2" variant="filled" style={{ width: 18, height: 18 }} />,
        onSelect: onEdit,
      },
      {
        label: '탭 삭제',
        icon: <Icon name="trash" variant="filled" style={{ width: 18, height: 18 }} />,
        onSelect: onDelete,
        danger: true,
      },
    ],
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '더보기' }));
    const menu = await screen.findByRole('menu');
    await expect(within(menu).getAllByRole('menuitem')).toHaveLength(2);
    await expect(within(menu).getByRole('separator')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  },
};
