import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { Icon } from '../../icons/Icon';
import { AccountMenu, AccountMenuTrigger } from './AccountMenu';

const meta = {
  title: 'Components/AccountMenu',
  component: AccountMenu,
  parameters: { layout: 'centered' },
  args: {
    trigger: <AccountMenuTrigger name="김두둥" />,
    profile: {
      name: '김두둥',
      email: 'dudoong@gmail.com',
      href: '#profile',
      label: '프로필 편집',
    },
    items: [
      { key: 'tickets', label: '티켓', href: '#tickets', icon: <Icon name="ticket" /> },
      { key: 'orders', label: '주문내역', href: '#orders', icon: <Icon name="order-detail" /> },
      {
        key: 'following',
        label: '관심 호스트',
        href: '#following',
        icon: <Icon name="favorite" />,
      },
      {
        key: 'archive',
        label: '지난 공연 아카이빙',
        href: '#archive',
        icon: <Icon name="archiving" />,
      },
    ],
    hosts: {
      title: '내 호스트',
      rows: [
        { key: '1', name: '둥둥즈', href: '#host-1' },
        { key: '2', name: '토마토마토', href: '#host-2' },
      ],
      create: {
        key: 'newHost',
        label: '새 호스트 만들기',
        href: '#new-host',
        icon: <Icon name="add" />,
      },
    },
    onLogout: () => {},
  },
} satisfies Meta<typeof AccountMenu>;
export default meta;

type Story = StoryObj<typeof meta>;

/** 디자인 시스템 `My`(`585:752`) — 프로필 / 항목 4 / 내 호스트 / 로그아웃. 업데이트 노트는 두지 않는다(Q4) */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: '내 메뉴' });
    await userEvent.click(trigger);
    const menu = await screen.findByRole('menu');
    await expect(within(menu).getByRole('menuitem', { name: '주문내역' })).toBeVisible();
    await expect(within(menu).queryByText('서비스 업데이트 노트')).toBeNull();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

/** 소속 호스트 없음 */
export const NoHosts: Story = {
  args: {
    hosts: {
      title: '내 호스트',
      rows: [],
      emptyText: '아직 두둥에서 호스트가 없어요.',
      create: {
        key: 'newHost',
        label: '새 호스트 만들기',
        href: '#new-host',
        icon: <Icon name="add" />,
      },
    },
  },
};

/** 10개 넘음 — 더 보기는 공연준비 홈 호스트 탭으로 */
export const ManyHosts: Story = {
  args: {
    hosts: {
      title: '내 호스트',
      rows: Array.from({ length: 10 }, (_, i) => ({
        key: String(i),
        name: `호스트 ${i + 1}`,
        href: `#host-${i}`,
      })),
      more: { key: 'more', label: '3개 더 보기', href: '#more' },
      create: {
        key: 'newHost',
        label: '새 호스트 만들기',
        href: '#new-host',
        icon: <Icon name="add" />,
      },
    },
  },
};
