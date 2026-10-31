'use client';

import Link from 'next/link';
import { overlay } from 'overlay-kit';
import type { ComponentPropsWithRef, MouseEvent, ReactNode } from 'react';

import { Avatar } from '@/ui/components/Avatar/Avatar';
import { Button } from '@/ui/components/Button/Button';
import { Drawer } from '@/ui/components/Drawer/Drawer';
import { Tooltip } from '@/ui/components/Tooltip/Tooltip';
import { Icon } from '@/ui/icons/Icon';
import { Divider } from '@/ui/primitives/Divider';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { ShellLink } from './model/shell-menu';
import { type ShellMenuState, useShellMenu } from './model/useShellMenu';
import * as s from './ShellDrawer.css';
import { SHELL_LINK_ICON, ShellBell } from './ShellParts';

/**
 * 햄버거 드로어를 연다(관객·호스팅 같은 메뉴). `ShellMenuButton`이 누를 때 이 모듈을 불러와 부른다 —
 * 드로어(vaul)·말풍선·본문을 셸 첫 화면 번들에 넣지 않는다(P4s-V: 셸에 정적으로 넣으면 빌드에서 보호 화면 본문이 그려지지 않았다).
 * overlay-kit으로 연다(patterns §6) — 경로가 바뀌면 `OverlayRouteReset`이 내린다.
 */
export function openShellDrawer() {
  overlay.open(({ isOpen, close, unmount }) => (
    <Drawer
      open={isOpen}
      onOpenChange={(o) => !o && close()}
      onExited={unmount}
      title="메뉴"
      headerTrailing={<DrawerBell />}
    >
      <ShellDrawerContent onNavigateSame={close} />
    </Drawer>
  ));
}

/** 드로어 안은 overlay-kit이 따로 그리므로 메뉴 상태를 다시 읽는다(같은 캐시) */
function DrawerBell() {
  return <ShellBell state={useShellMenu()} />;
}

/**
 * 드로어 본문 — 와이어 `128:2875`(로그인) · `128:2931`(미로그인) 구조를 DS 토큰·컴포넌트로(와이어 수준, design-workflow §3).
 * 프로필(또는 [로그인 ›]) / 항목 / 공연 둘러보기 ↗ / 공연 준비 ↗ + 말풍선 + 호스트 줄 / 새 호스트·새 공연 만들기 / 로그아웃.
 * AD 칸·서비스 업데이트 노트는 목적지가 없어 그리지 않는다(design-requests Q4).
 */
export function ShellDrawerContent({ onNavigateSame }: { onNavigateSame: () => void }) {
  const state = useShellMenu();
  const go = (l: ShellLink, children: ReactNode, className = s.row) => (
    <DrawerLink key={l.key} link={l} className={className} onSame={onNavigateSame}>
      {children}
    </DrawerLink>
  );

  if (state.status === 'error') {
    return (
      <Flex direction="column" align="flex-start" gap={3}>
        <Txt typography="bodyMd" color={colors.textSecondaryLabel}>
          메뉴를 불러오지 못했어요.
        </Txt>
        <Button variant="secondary" size="sm" onClick={state.retry}>
          다시 시도
        </Button>
      </Flex>
    );
  }
  if (state.status === 'pending') return <DrawerPending />;

  const { menu } = state;
  const browse = menu.shortcuts.find((l) => l.key === 'browse');
  const hosting = menu.shortcuts.find((l) => l.key === 'hosting');
  return (
    <Flex direction="column" gap={5} fullWidth>
      {menu.kind === 'session'
        ? go(
            menu.profile.edit,
            <>
              <span className={s.profileAvatar}>
                <Avatar size={60} src={menu.profile.profileImageUrl} />
                <span className={s.editBadge} aria-hidden>
                  <Icon name="edit" className={s.editIcon} />
                </span>
              </span>
              <span className={s.profileText}>
                <Txt typography="headingMd2Emphasized" lines={1}>
                  {menu.profile.name}
                </Txt>
                <Txt typography="labelMd" color={colors.textSecondaryLabel} lines={1}>
                  {menu.profile.email}
                </Txt>
              </span>
              <span className={s.visuallyHidden}>{menu.profile.edit.label}</span>
            </>,
            s.profile,
          )
        : go(
            menu.login,
            <>
              <Avatar size={60} />
              <Txt typography="headingMd2Emphasized">로그인</Txt>
              <Icon name="chevron-right" />
            </>,
            s.profile,
          )}

      <Flex as="ul" direction="column" className={s.list}>
        {menu.items.map((l) => (
          <li key={l.key}>
            {go(
              l,
              <>
                {SHELL_LINK_ICON[l.key]}
                <Txt typography="headingMd2">{l.label}</Txt>
              </>,
            )}
          </li>
        ))}
      </Flex>

      <Divider />
      {browse && go(browse, <ShortcutLabel label={browse.label} />, s.shortcut)}
      <Divider />

      <Flex direction="column" gap={4} fullWidth>
        {hosting && (
          <Tooltip
            content="두둥에서 공연을 시작해보세요!"
            side="right"
            open
            updatePositionStrategy="always"
          >
            {go(hosting, <ShortcutLabel label={hosting.label} />, s.shortcut)}
          </Tooltip>
        )}
        <HostRow state={state} onSame={onNavigateSame} />
        <Flex gap={5} wrap>
          {menu.create.map((l) =>
            go(
              l,
              <>
                {SHELL_LINK_ICON[l.key]}
                <Txt typography="headingMd2">{l.label}</Txt>
              </>,
            ),
          )}
        </Flex>
      </Flex>

      {state.logout && (
        <>
          <Divider />
          <button
            type="button"
            className={s.row}
            onClick={() => void state.logout?.logout()}
            disabled={state.logout.disabled}
          >
            <Icon name="log-out" />
            <Txt typography="headingMd2">로그아웃</Txt>
          </button>
        </>
      )}
    </Flex>
  );
}

function ShortcutLabel({ label }: { label: string }) {
  return (
    <>
      <Txt typography="headingMdEmphasized">{label}</Txt>
      <Icon name="diagonal" />
    </>
  );
}

/** 소속 호스트 아바타 줄(가로 스크롤). 0개면 문구, 10개 넘으면 "N개 더 보기" */
function HostRow({
  state,
  onSame,
}: {
  state: ShellMenuState & { status: 'ready' };
  onSame: () => void;
}) {
  const { hostRow } = state.menu;
  if (hostRow.emptyText) {
    return (
      <Txt as="p" typography="bodyMd" color={colors.textSecondaryLabel} className={s.empty}>
        {hostRow.emptyText}
      </Txt>
    );
  }
  return (
    <ul className={s.hostRow} aria-label="내 호스트">
      {hostRow.hosts.map((h) => (
        <li key={h.hostId}>
          <DrawerLink
            link={{
              key: 'hosting',
              label: h.name ?? '',
              href: h.href,
              to: h.href,
              viaLogin: false,
            }}
            className={s.host}
            onSame={onSame}
          >
            <Avatar size={60} src={h.profileImageUrl} />
            <Txt typography="labelMd" lines={1} className={s.hostName}>
              {h.name}
            </Txt>
          </DrawerLink>
        </li>
      ))}
      {hostRow.more && (
        <li>
          <DrawerLink
            link={{
              key: 'hosting',
              label: '더 보기',
              href: hostRow.more.href,
              to: hostRow.more.href,
              viaLogin: false,
            }}
            className={s.host}
            onSame={onSame}
          >
            <span className={s.moreCircle}>
              <Icon name="more" />
            </span>
            <Txt typography="labelMd" lines={1}>
              {hostRow.more.count}개 더 보기
            </Txt>
          </DrawerLink>
        </li>
      )}
    </ul>
  );
}

/** 확인 중 — 사용자별 줄은 비활성 자리표시(patterns §4-2) */
function DrawerPending() {
  return (
    <Flex align="center" gap={5}>
      <Avatar size={60} />
      <Txt typography="headingMd2" color={colors.textTertiaryLabel}>
        불러오는 중
      </Txt>
    </Flex>
  );
}

/**
 * 드로어 안 링크 — 오버레이 안 이동이라 `replace`(patterns §6). 지금 주소와 같은 곳이면 경로가 바뀌지 않아
 * 드로어가 내려가지 않으므로 이동 대신 닫는다.
 */
function DrawerLink({
  link,
  className,
  onSame,
  children,
  onClick: outerOnClick,
  ...rest
}: Omit<ComponentPropsWithRef<'a'>, 'href'> & {
  link: ShellLink;
  className: string;
  onSame: () => void;
  children: ReactNode;
}) {
  // Tooltip(asChild)이 ref·이벤트·aria를 넘긴다 — 그대로 링크에 붙인다
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    outerOnClick?.(e);
    const url = new URL(link.href, window.location.href);
    if (url.pathname === window.location.pathname && url.search === window.location.search) {
      e.preventDefault();
      onSame();
    }
  };
  return (
    <Link {...rest} href={link.href} replace className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
