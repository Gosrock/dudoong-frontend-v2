import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Icon } from '../../icons/Icon';
import { SidebarMenuItem } from './SidebarMenu';

const meta = {
  title: 'Components/SidebarMenu',
  component: SidebarMenuItem,
  args: { href: '#', icon: <Icon name="info" />, children: '기본 정보' },
  decorators: [
    (Story) => (
      // 공연 사이드바의 검정 면(268, 좌우 16) 위에서만 쓴다
      <div style={{ width: 268, padding: 16, boxSizing: 'border-box', background: '#0a0a09' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SidebarMenuItem>;
export default meta;

type Story = StoryObj<typeof meta>;

/** 디자인 시스템 `사이드바 메뉴` `false` */
export const Default: Story = {};

/** `true` — 지금 있는 곳(`aria-current="page"`, 굵게 + 옅은 배경). 대시보드만 아이콘이 filled */
export const Selected: Story = {
  args: { selected: true, icon: <Icon name="dashboard" variant="filled" />, children: '대시보드' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('link', { name: '대시보드' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  },
};

/** `alert` — 오른쪽 빨간 숫자 배지(예매자 관리 — 승인 대기 수, Q39 기본안) */
export const Alert: Story = {
  args: {
    icon: <Icon name="people" />,
    children: '예매자 관리',
    badge: 3,
    badgeLabel: '승인 대기 3건',
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('img', { name: '승인 대기 3건' }),
    ).toHaveTextContent('3');
  },
};

/** 메뉴 6개(등록 후) — GUI `748:34025` */
export const Menu: Story = {
  render: () => (
    <ul
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        margin: 0,
        padding: 0,
        listStyle: 'none',
      }}
    >
      {[
        ['dashboard', '대시보드'],
        ['info', '기본 정보'],
        ['detail', '상세 정보'],
        ['ticket', '티켓 관리'],
        ['people', '예매자 관리'],
        ['qr', 'QR 체크인'],
      ].map(([icon, label], i) => (
        <li key={label}>
          <SidebarMenuItem
            href="#"
            selected={i === 1}
            icon={<Icon name={icon as 'info'} />}
            badge={icon === 'people' ? 3 : undefined}
          >
            {label}
          </SidebarMenuItem>
        </li>
      ))}
    </ul>
  ),
};
