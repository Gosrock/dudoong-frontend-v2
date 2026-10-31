'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { AccountMenu, AccountMenuTrigger } from '@/ui/components/AccountMenu/AccountMenu';
import { Button } from '@/ui/components/Button/Button';
import { TopBarIconLink } from '@/ui/components/TopBar/TopBar';
import { Icon } from '@/ui/icons/Icon';

import type { ShellLink, ShellLinkKey, ShellMenu } from './model/shell-menu';
import type { ShellMenuState } from './model/useShellMenu';

/** 메뉴 항목 아이콘 — 디자인 시스템 `My`(`585:752`)와 같은 `ic`. 와이어 햄버거(`128:2875`)도 같은 모양이다 */
export const SHELL_LINK_ICON: Partial<Record<ShellLinkKey, ReactNode>> = {
  tickets: <Icon name="ticket" />,
  orders: <Icon name="order-detail" />,
  following: <Icon name="favorite" />,
  archive: <Icon name="archiving" />,
  newHost: <Icon name="add" />,
  newEvent: <Icon name="add" />,
};

/**
 * 알림 벨(관객 햄버거 · 호스팅 드로어 · 호스팅 PC 상단 바). 안 읽은 알림이 있으면 `notification-on`(빨간 점 — 디자인 시스템 아이콘).
 * 익명은 `/login?redirect=/mypage/notifications`(Q16). 메뉴가 준비되기 전에는 그리지 않는다.
 */
export function ShellBell({ state }: { state: ShellMenuState }) {
  if (state.status !== 'ready') return null;
  const { bell } = state.menu;
  return (
    <TopBarIconLink
      linkAs={Link}
      href={bell.href}
      aria-label={state.hasUnread ? '알림(새 알림 있음)' : '알림'}
      icon={<Icon name={state.hasUnread ? 'notification-on' : 'notification'} />}
    />
  );
}

/** 메뉴 조회(GM-1) 실패 — 공개 화면을 막지 않고 다시 시도만 둔다(useShellMenu) */
export function ShellRetry({ state }: { state: ShellMenuState }) {
  if (state.status !== 'error') return null;
  return (
    <Button variant="secondary" size="sm" onClick={state.retry}>
      다시 시도
    </Button>
  );
}

/** 공지 목록 입구 문구 — DS `My` · 와이어 PC 드롭다운 · GUI 햄버거 `331:11622`의 글자 그대로(design-requests Q4 → P9c-V) */
export const SHELL_NOTICES_LABEL = '서비스 업데이트 노트';

const linkProps = (l: ShellLink) => ({ key: l.key, label: l.label, href: l.href });

/**
 * PC 아바타 ▾ 메뉴(디자인 시스템 `My`). 세션일 때만 — 익명은 [로그인], 확인 중은 같은 크기의 빈 자리(레이아웃이 흔들리지 않게).
 * 항목은 `My`대로 티켓·주문내역·관심 호스트·아카이빙 / 내 호스트 + 새 호스트 만들기 / 로그아웃.
 */
export function ShellAccountMenu({
  menu,
  state,
  noticesHref,
}: {
  menu: ShellMenu & { kind: 'session' };
  state: ShellMenuState & { status: 'ready' };
  /** "서비스 업데이트 노트"가 갈 공지 목록(P9c-V). 없으면 그 항목을 두지 않는다 */
  noticesHref?: string;
}) {
  const { hostRow } = menu;
  const newHost = menu.create.find((l) => l.key === 'newHost');
  return (
    <AccountMenu
      linkAs={Link}
      onOpenChange={(open) => open && state.refreshBell()}
      trigger={
        <AccountMenuTrigger name={menu.profile.name} imageUrl={menu.profile.profileImageUrl} />
      }
      profile={{
        name: menu.profile.name,
        email: menu.profile.email,
        imageUrl: menu.profile.profileImageUrl,
        href: menu.profile.edit.href,
        label: menu.profile.edit.label,
      }}
      items={menu.items.map((l) => ({ ...linkProps(l), icon: SHELL_LINK_ICON[l.key] }))}
      hosts={{
        title: '내 호스트',
        rows: hostRow.hosts.map((h) => ({
          key: String(h.hostId),
          name: h.name,
          href: h.href,
          imageUrl: h.profileImageUrl,
        })),
        emptyText: hostRow.emptyText,
        more: hostRow.more && {
          key: 'more',
          label: `${hostRow.more.count}개 더 보기`,
          href: hostRow.more.href,
        },
        create: newHost && { ...linkProps(newHost), icon: SHELL_LINK_ICON.newHost },
      }}
      footerItems={
        noticesHref
          ? [
              {
                key: 'notices',
                label: SHELL_NOTICES_LABEL,
                href: noticesHref,
                icon: <Icon name="update" />,
              },
            ]
          : undefined
      }
      onLogout={state.logout ? () => void state.logout?.logout() : undefined}
      logoutDisabled={state.logout?.disabled}
    />
  );
}
