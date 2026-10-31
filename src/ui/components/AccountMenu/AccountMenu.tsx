'use client';

import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import type { ComponentPropsWithRef, ElementType, ReactNode } from 'react';

import { Icon } from '../../icons/Icon';
import { Txt } from '../../primitives/Txt';
import { colors } from '../../theme/colors';
import { Avatar } from '../Avatar/Avatar';
import * as s from './AccountMenu.css';

export type AccountMenuLink = {
  key: string;
  label: ReactNode;
  href: string;
  /** 아이콘(`<Icon name="ticket" />`). Figma는 20 — 코드에 24만 있어 CSS로 20에 맞춘다 */
  icon?: ReactNode;
};

export type AccountMenuHost = {
  key: string;
  name: ReactNode;
  href: string;
  imageUrl?: string | null;
};

export type AccountMenuProps = {
  /** 여는 버튼(asChild로 붙는다) — 보통 `<AccountMenuTrigger>` */
  trigger: ReactNode;
  profile: {
    name: ReactNode;
    email?: ReactNode;
    imageUrl?: string | null;
    /** 프로필 줄을 누르면 가는 곳(프로필 편집) */
    href: string;
    /** 프로필 줄의 접근성 이름 */
    label: string;
  };
  /** 티켓 · 주문내역 · 관심 호스트 · 지난 공연 아카이빙 */
  items: AccountMenuLink[];
  hosts: {
    title: ReactNode;
    rows: AccountMenuHost[];
    /** 소속 호스트가 없을 때 문구 */
    emptyText?: ReactNode;
    /** 보여 주지 않은 호스트가 있을 때 */
    more?: AccountMenuLink | null;
    /** 새 호스트 만들기 */
    create?: AccountMenuLink;
  };
  onLogout?: () => void;
  logoutDisabled?: boolean;
  /** 열릴 때(벨 다시 읽기 등) */
  onOpenChange?: (open: boolean) => void;
  /** 항목 링크를 그릴 컴포넌트(기본 `<a>`). 앱에서는 next/link */
  linkAs?: ElementType;
};

/**
 * PC 아바타 ▾ 메뉴 — 디자인 시스템 `My`(`585:752`, 와이어 `640:17991`). 동작은 Radix DropdownMenu
 * (방향키 이동, Enter 선택, Esc로 닫고 트리거로 포커스 복귀). 구획: 프로필 / 항목 / 내 호스트 / 로그아웃.
 * "서비스 업데이트 노트"는 목적지가 없어 두지 않는다(design-requests Q4).
 */
export function AccountMenu({
  trigger,
  profile,
  items,
  hosts,
  onLogout,
  logoutDisabled,
  onOpenChange,
  linkAs: LinkTag = 'a',
}: AccountMenuProps) {
  const linkItem = (l: AccountMenuLink) => (
    <RadixMenu.Item key={l.key} asChild className={s.item}>
      <LinkTag href={l.href}>
        {l.icon && <span className={s.icon}>{l.icon}</span>}
        {l.label}
      </LinkTag>
    </RadixMenu.Item>
  );

  return (
    <RadixMenu.Root modal={false} onOpenChange={onOpenChange}>
      <RadixMenu.Trigger asChild>{trigger}</RadixMenu.Trigger>
      <RadixMenu.Portal>
        <RadixMenu.Content
          side="bottom"
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className={s.content}
        >
          <RadixMenu.Item asChild className={s.profile}>
            <LinkTag href={profile.href} aria-label={profile.label}>
              <span className={s.profileAvatar}>
                <Avatar size={45} src={profile.imageUrl} />
                <span className={s.editBadge} aria-hidden>
                  <Icon name="edit" className={s.editIcon} />
                </span>
              </span>
              <span className={s.profileText}>
                <Txt typography="labelLgEmphasized" className={s.ellipsis}>
                  {profile.name}
                </Txt>
                {profile.email && (
                  <Txt
                    typography="labelSm"
                    color={colors.textSecondaryLabel}
                    className={s.ellipsis}
                  >
                    {profile.email}
                  </Txt>
                )}
              </span>
            </LinkTag>
          </RadixMenu.Item>

          <RadixMenu.Group className={s.section}>{items.map(linkItem)}</RadixMenu.Group>

          <RadixMenu.Group className={s.section}>
            <RadixMenu.Label className={s.sectionTitle}>
              <Txt typography="labelSm" color={colors.textSecondaryLabel}>
                {hosts.title}
              </Txt>
            </RadixMenu.Label>
            {hosts.rows.map((h) => (
              <RadixMenu.Item key={h.key} asChild className={s.item}>
                <LinkTag href={h.href}>
                  <Avatar size={24} src={h.imageUrl} />
                  <span className={s.ellipsis}>{h.name}</span>
                </LinkTag>
              </RadixMenu.Item>
            ))}
            {hosts.emptyText && (
              <Txt
                as="p"
                typography="labelMd"
                color={colors.textSecondaryLabel}
                className={s.empty}
              >
                {hosts.emptyText}
              </Txt>
            )}
            {hosts.more && linkItem(hosts.more)}
            {hosts.create && linkItem(hosts.create)}
          </RadixMenu.Group>

          {onLogout && (
            <RadixMenu.Group className={s.lastSection}>
              <RadixMenu.Item className={s.item} disabled={logoutDisabled} onSelect={onLogout}>
                <span className={s.icon}>
                  <Icon name="log-out" />
                </span>
                로그아웃
              </RadixMenu.Item>
            </RadixMenu.Group>
          )}
        </RadixMenu.Content>
      </RadixMenu.Portal>
    </RadixMenu.Root>
  );
}

/**
 * 상단 바 오른쪽 아바타 ▾ 버튼(`Top bar_Host` — Avatar 32 + 간격 10 + 닉네임 Label/md + `chevron-down` 12).
 * `AccountMenu`의 `trigger`로 넘긴다(Radix가 ref·aria 속성을 붙인다).
 */
export function AccountMenuTrigger({
  name,
  imageUrl,
  className,
  ...rest
}: Omit<ComponentPropsWithRef<'button'>, 'children' | 'name'> & {
  name: ReactNode;
  imageUrl?: string | null;
}) {
  return (
    <button
      type="button"
      className={className ? `${s.trigger} ${className}` : s.trigger}
      aria-label="내 메뉴"
      {...rest}
    >
      <Avatar size={32} src={imageUrl} />
      <Txt typography="labelMd" className={s.ellipsis}>
        {name}
      </Txt>
      <Icon name="chevron-down" size={12} />
    </button>
  );
}
