import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Icon } from '../../icons/Icon';
import { AccountMenu, AccountMenuTrigger } from '../AccountMenu/AccountMenu';
import { button } from '../Button/Button.css';
import { TopBar, TopBarIconButton, TopBarIconLink } from './TopBar';

const account = (
  <AccountMenu
    trigger={<AccountMenuTrigger name="김두둥" />}
    profile={{ name: '김두둥', email: 'dudoong@gmail.com', href: '#profile', label: '프로필 편집' }}
    items={[
      { key: 'tickets', label: '티켓', href: '#tickets', icon: <Icon name="ticket" /> },
      { key: 'orders', label: '주문내역', href: '#orders', icon: <Icon name="order-detail" /> },
    ]}
    hosts={{ title: '내 호스트', rows: [{ key: '1', name: '둥둥즈', href: '#host' }] }}
    onLogout={() => {}}
  />
);

const meta = {
  title: 'Components/TopBar',
  component: TopBar,
  parameters: { layout: 'fullscreen' },
  args: {
    logoHref: '#',
    nav: [
      { key: 'browse', label: '공연 둘러보기', href: '#events' },
      { key: 'hosting', label: '공연 준비하기', href: '#hosting', active: true },
    ],
  },
} satisfies Meta<typeof TopBar>;
export default meta;

type Story = StoryObj<typeof meta>;

/** 호스팅 — 디자인 시스템 `Top bar_Host`(GUI `712:1648`): "공연 준비하기"가 굵은 검정, 벨 + 아바타 ▾ */
export const Hosting: Story = {
  args: {
    trailing: (
      <>
        <TopBarIconButton aria-label="알림" icon={<Icon name="notification" />} />
        {account}
      </>
    ),
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('link', { name: '공연 준비하기' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(c.getByRole('button', { name: '알림' })).toBeVisible();
  },
};

/** 관객 로그인 전 — 와이어 `626:19888`: 메뉴 둘 다 검정(`plainNav`), 검색 + [로그인] */
export const AudienceAnonymous: Story = {
  args: {
    plainNav: true,
    nav: [
      { key: 'browse', label: '공연 둘러보기', href: '#events' },
      { key: 'hosting', label: '공연 준비하기', href: '#hosting' },
    ],
    trailing: (
      <>
        <TopBarIconLink href="#events" aria-label="공연 검색" icon={<Icon name="search" />} />
        <a href="#login" className={button({ variant: 'secondary', size: 'sm' })}>
          로그인
        </a>
      </>
    ),
  },
};

/** 관객 로그인 후 — 와이어 `640:17991`: 검색 + 아바타 ▾ */
export const AudienceSession: Story = {
  args: {
    plainNav: true,
    nav: AudienceAnonymous.args!.nav!,
    trailing: (
      <>
        <TopBarIconLink href="#events" aria-label="공연 검색" icon={<Icon name="search" />} />
        {account}
      </>
    ),
  },
};
