import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Txt } from '../../primitives/Txt';
import { colors } from '../../theme/colors';
import { Chip } from '../Chip/Chip';
import { DataTable, type DataTableColumn } from './DataTable';

type Order = {
  uuid: string;
  name: string;
  phone: string;
  ticket: string;
  count: number;
  paid: boolean;
};

const orders: Order[] = Array.from({ length: 10 }, (_, i) => ({
  uuid: `order-${i}`,
  name: ['김두둥', '이고스락', '박밴드', '최공연'][i % 4] ?? '김두둥',
  phone: `010-1234-${String(1000 + i)}`,
  ticket: i % 3 === 0 ? '일반 예매 (스탠딩 앞쪽 구역 우선 입장)' : '일반 예매',
  count: (i % 3) + 1,
  paid: i % 2 === 0,
}));

const columns: DataTableColumn<Order>[] = [
  { id: 'name', header: '예매자', cell: (o) => o.name },
  { id: 'phone', header: '연락처', cell: (o) => o.phone },
  {
    id: 'ticket',
    header: '티켓',
    cell: (o) => (
      <Txt typography="bodyMd" lines={1} style={{ maxWidth: 160, display: 'block' }}>
        {o.ticket}
      </Txt>
    ),
  },
  { id: 'count', header: '매수', cell: (o) => `${o.count}매`, align: 'right', width: 64 },
  {
    id: 'state',
    header: '상태',
    align: 'center',
    cell: (o) => (o.paid ? <Chip color="violet">승인완료</Chip> : <Chip>승인대기</Chip>),
  },
];

const meta = {
  title: 'Components/DataTable',
  component: DataTable<Order>,
  args: { columns, data: orders, caption: '주문 목록', getRowId: (o: Order) => o.uuid },
} satisfies Meta<typeof DataTable<Order>>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 서버사이드 페이지네이션 — 상태는 부르는 쪽이 가진다(보통 `?page=`) */
export const Paginated: Story = {
  args: { onPageChange: fn() },
  render: function Render(args) {
    const [pageIndex, setPageIndex] = useState(0);
    return (
      <DataTable
        {...args}
        pageIndex={pageIndex}
        pageCount={20}
        onPageChange={(i) => {
          args.onPageChange?.(i);
          setPageIndex(i);
        }}
      />
    );
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const nav = canvas.getByRole('navigation', { name: '페이지' });
    const pages = within(nav);

    await expect(pages.getByRole('button', { name: '1 페이지' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(pages.getByRole('button', { name: '이전 페이지' })).toBeDisabled();

    // 키보드: 다음 페이지 버튼에 포커스 → Enter
    pages.getByRole('button', { name: '다음 페이지' }).focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onPageChange).toHaveBeenLastCalledWith(1);
    await expect(pages.getByRole('button', { name: '2 페이지' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    // 번호 버튼은 Tab으로 가서 Space로 누른다
    pages.getByRole('button', { name: '5 페이지' }).focus();
    await userEvent.keyboard(' ');
    await expect(pages.getByRole('button', { name: '5 페이지' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(pages.getByRole('button', { name: '1 페이지' })).not.toHaveAttribute(
      'aria-current',
    );

    await userEvent.click(pages.getByRole('button', { name: '20 페이지' }));
    await expect(pages.getByRole('button', { name: '다음 페이지' })).toBeDisabled();
  },
};

/** 행 클릭(Enter·Space 포함) — 주문 상세 열기 */
export const RowClick: Story = {
  args: { onRowClick: fn(), getRowLabel: (o: Order) => `${o.name} 주문 상세` },
  play: async ({ canvasElement, args }) => {
    const [row] = within(canvasElement).getAllByRole('row', { name: '이고스락 주문 상세' });
    if (!row) throw new Error('row not found');
    row.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onRowClick).toHaveBeenCalledWith(orders[1]);
  },
};

export const Empty: Story = {
  args: {
    data: [],
    empty: (
      <Txt typography="bodyMd" color={colors.textSecondary}>
        예매자가 없어요
      </Txt>
    ),
  },
};

/** 로딩 슬롯 — 실제로는 Skeleton을 넣는다 */
export const Loading: Story = {
  args: {
    loading: (
      <Txt typography="bodyMd" color={colors.textSecondary}>
        불러오는 중…
      </Txt>
    ),
    pageIndex: 2,
    pageCount: 5,
    onPageChange: fn(),
  },
};

/**
 * 모바일 칸 폭 `mobileWidth`(~1023) — 고정 칸에 주고, 주지 않은 칸(주문자)이 남은 폭을 채운다
 * (GUI 발급된 티켓 모바일 `1003:3142` — 주문자 FILL · 티켓 88 · 체크인 92 · 상세 20, I-h5). 값은 칸 사이 간격을 더한 폭
 */
export const MobileWidth: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 342 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    columns: [
      { id: 'name', header: '주문자', cell: (o) => o.name },
      { id: 'count', header: '티켓', cell: (o) => `${o.count}매`, mobileWidth: 96 },
      {
        id: 'state',
        header: '체크인',
        mobileWidth: 100,
        cell: (o) => (o.paid ? <Chip color="green">입장 완료</Chip> : <Chip>입장 전</Chip>),
      },
      { id: 'detail', header: '', cell: () => '›', mobileWidth: 32 },
    ],
  },
  play: async ({ canvasElement }) => {
    if (window.innerWidth >= 1024) return;
    const c = within(canvasElement);
    const width = (name: string) =>
      c.getByRole('columnheader', { name }).getBoundingClientRect().width;
    await expect(width('티켓')).toBe(96);
    await expect(width('체크인')).toBe(100);
    // 342 - 테두리 2 - 96 - 100 - 32
    await expect(width('주문자')).toBe(112);
  },
};
