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

/** 디자인 시스템 `My`(`585:752`) — 프로필 / 항목 4 / 내 호스트 / 로그아웃. `footerItems`를 주지 않으면 업데이트 노트 줄이 없다 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: /내 메뉴$/ });
    await userEvent.click(trigger);
    const menu = await screen.findByRole('menu');
    await expect(within(menu).getByRole('menuitem', { name: '주문내역' })).toBeVisible();
    await expect(within(menu).queryByText('서비스 업데이트 노트')).toBeNull();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

/** 셸이 쓰는 모양(P9c-V) — 마지막 구획에 "서비스 업데이트 노트"(`update`, 공지 목록) + 로그아웃. DS `My`와 같은 순서 */
export const WithUpdateNote: Story = {
  args: {
    footerItems: [
      {
        key: 'notices',
        label: '서비스 업데이트 노트',
        href: '#notices',
        icon: <Icon name="update" />,
      },
    ],
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /내 메뉴$/ }));
    const menu = await screen.findByRole('menu');
    const items = within(menu).getAllByRole('menuitem');
    const names = items.map((i) => i.textContent);
    await expect(names.slice(-2)).toEqual(['서비스 업데이트 노트', '로그아웃']);
    await expect(
      within(menu).getByRole('menuitem', { name: '서비스 업데이트 노트' }),
    ).toHaveAttribute('href', '#notices');
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
