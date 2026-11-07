'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import Link from 'next/link';
import { overlay } from 'overlay-kit';
import type { MouseEvent, ReactNode } from 'react';

import { Avatar } from '@/ui/components/Avatar/Avatar';
import { Drawer } from '@/ui/components/Drawer/Drawer';
import { InlineError } from '@/ui/components/InlineError/InlineError';
import { Icon } from '@/ui/icons/Icon';
import type { IconName } from '@/ui/icons/registry';
import { Divider } from '@/ui/primitives/Divider';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { type ShellLink, shellLink, type ShellLinkKey } from './model/shell-menu';
import { type ShellMenuState, useShellMenu } from './model/useShellMenu';
import * as s from './ShellDrawer.css';
import { SHELL_NOTICES_LABEL, ShellBell } from './ShellParts';

/**
 * 햄버거 드로어를 연다(관객·호스팅 같은 메뉴). `ShellMenuButton`이 누를 때 이 모듈을 불러와 부른다 —
 * 드로어(vaul)·말풍선·본문을 셸 첫 화면 번들에 넣지 않는다(P4s-V: 셸에 정적으로 넣으면 빌드에서 보호 화면 본문이 그려지지 않았다).
 * overlay-kit으로 연다(patterns §6) — 경로가 바뀌면 `OverlayRouteReset`이 내린다.
 */
export function openShellDrawer({ noticesHref }: { noticesHref?: string } = {}) {
  overlay.open(({ isOpen, close, unmount }) => (
    <Drawer
      open={isOpen}
      onOpenChange={(o) => !o && close()}
      onExited={unmount}
      title="메뉴"
      variant="menu"
      headerTrailing={<DrawerBell />}
    >
      <ShellDrawerContent onNavigateSame={close} noticesHref={noticesHref} />
    </Drawer>
  ));
}

/** 드로어 안은 overlay-kit이 따로 그리므로 메뉴 상태를 다시 읽는다(같은 캐시) */
function DrawerBell() {
  return <ShellBell state={useShellMenu()} />;
}

/**
 * 드로어 메뉴 줄 — GUI 햄버거(`1047:19428` 로그인 · `1174:15071` 미로그인, Ready 2026-11-07)대로 주문내역 · 관심 호스트 ·
 * 지난 관람 아카이빙. "티켓"은 GUI에 없다(로고 헤더의 티켓 아이콘이 입구 — Q131 · Q184). 미로그인도 같은 세 줄이고
 * 누르면 로그인으로 보낸다(Q16). PC 아바타 메뉴(DS `My`)는 `menu.items` 그대로 — 근거가 달라 묶지 않는다.
 */
const DRAWER_ITEMS = [
  { key: 'orders', label: '주문내역', icon: 'order-detail' },
  { key: 'following', label: '관심 호스트', icon: 'favorite' },
  { key: 'archive', label: '지난 관람 아카이빙', icon: 'archiving' },
] as const satisfies readonly { key: ShellLinkKey; label: string; icon: IconName }[];

/** GUI 섹션 이름 "호스팅 센터"(`1047:31947`) — Ready 화면이 이긴다(Q131 닫음. 코드 다른 곳의 "공연 준비"는 그대로) */
const DRAWER_HOSTING_LABEL = '호스팅 센터';
/** GUI 빈 호스트 칸 글자(`1175:15424`, 마침표 없음). PC 아바타 메뉴는 `SHELL_HOSTS_EMPTY_TEXT` 그대로 */
const DRAWER_HOSTS_EMPTY = '아직 두둥에서 호스트가 없어요';
/** 새 호스트 · 새 공연 — DS `ic_add host`(`805:1168`) · `ic_add concert`(`805:1183`) */
const DRAWER_CREATE_ICON: Partial<Record<ShellLinkKey, ReactNode>> = {
  newHost: <Icon name="add-host" />,
  newEvent: <Icon name="add-concert" />,
};

/**
 * 드로어 본문 — GUI 햄버거 `1047:19428`(로그인) · `1174:15071`(미로그인), Ready 2026-11-07.
 * 프로필(또는 [로그인 ›]) / 주문내역 · 관심 호스트 · 지난 관람 아카이빙 / 공연 둘러보기 ↗ / 호스팅 센터 ↗ + 호스트 줄(없으면 회색 칸)
 * + 새 호스트 · 새 공연 만들기 / 공지사항 · 로그아웃.
 * 그리지 않는 것: "Buy me a coffee" 배너(`1175:15449` — 후원 링크 주소가 없다, Q181) · AD 칸(Q4 · Q131 — 광고 대기),
 * 미로그인 프레임의 로그아웃(익명에는 로그아웃이 없다, Q182). "공연 준비" 옆 말풍선은 GUI에서 빠졌다(Q184).
 */
export function ShellDrawerContent({
  onNavigateSame,
  noticesHref,
}: {
  onNavigateSame: () => void;
  noticesHref?: string;
}) {
  const state = useShellMenu();
  const go = (l: { key: string; href: string }, children: ReactNode, className = s.row) => (
    <DrawerLink key={l.key} link={l} className={className} onSame={onNavigateSame}>
      {children}
    </DrawerLink>
  );

  if (state.status === 'error') {
    return <InlineError message="메뉴를 불러오지 못했어요." onRetry={state.retry} />;
  }
  if (state.status === 'pending') return <DrawerPending />;

  const { menu } = state;
  const loggedIn = menu.kind === 'session';
  const browse = menu.shortcuts.find((l) => l.key === 'browse');
  const hosting = menu.shortcuts.find((l) => l.key === 'hosting');
  return (
    <Flex direction="column" gap={4} fullWidth>
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
                <Txt typography="labelLgEmphasized" lines={1}>
                  {menu.profile.name}
                </Txt>
                <Txt typography="labelSm" color={colors.textSecondaryLabel} lines={1}>
                  {menu.profile.email}
                </Txt>
              </span>
              <VisuallyHidden>{menu.profile.edit.label}</VisuallyHidden>
            </>,
            s.profile,
          )
        : go(
            menu.login,
            <>
              <Avatar size={60} />
              <span className={s.loginLabel}>
                <Txt typography="labelLgEmphasized">로그인</Txt>
                <Icon name="chevron-right" />
              </span>
            </>,
            s.profile,
          )}

      <Flex as="ul" direction="column" gap={4} className={s.list}>
        {DRAWER_ITEMS.map((item) => (
          <li key={item.key}>
            {go(
              shellLink(item.key, loggedIn),
              <>
                <Icon name={item.icon} />
                <Txt typography="labelLg" className={s.itemLabel}>
                  {item.label}
                </Txt>
              </>,
            )}
          </li>
        ))}
      </Flex>

      <DrawerDivider />
      {browse && go(browse, <ShortcutLabel label={browse.label} />, s.shortcut)}
      <DrawerDivider />
      {hosting && go(hosting, <ShortcutLabel label={DRAWER_HOSTING_LABEL} />, s.shortcut)}
      <HostRow state={state} onSame={onNavigateSame} />
      <Flex wrap className={s.create}>
        {menu.create.map((l) => {
          return go(
            l,
            <>
              {DRAWER_CREATE_ICON[l.key]}
              <Txt typography="labelLg" className={s.itemLabel}>
                {l.label}
              </Txt>
            </>,
          );
        })}
      </Flex>
      <DrawerDivider />

      {noticesHref &&
        go(
          { key: 'notices', href: noticesHref },
          <>
            <Icon name="settings" />
            <Txt typography="labelLg" className={s.itemLabel}>
              {SHELL_NOTICES_LABEL}
            </Txt>
          </>,
        )}

      {state.logout && (
        <button
          type="button"
          className={s.row}
          onClick={() => void state.logout?.logout()}
          disabled={state.logout.disabled}
        >
          <Icon name="log-out" />
          <Txt typography="labelLg" className={s.itemLabel}>
            로그아웃
          </Txt>
        </button>
      )}
    </Flex>
  );
}

/** GUI 구분선 묶음(`1047:32317` — 높이 8, 위아래 4 안에 1px 선) */
function DrawerDivider() {
  return (
    <div className={s.dividerBox}>
      <Divider />
    </div>
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

/**
 * 소속 호스트 아바타 줄(가로 스크롤, GUI `1047:31991` — 60 아바타 + 이름 2줄, 간격 16). 0개면 회색 칸 안내(`1175:15425`),
 * 10개 넘으면 "N개 더 보기"
 */
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
      <Txt
        as="p"
        typography="labelMd"
        color={colors.textTertiaryLabel}
        align="center"
        className={s.empty}
      >
        {DRAWER_HOSTS_EMPTY}
      </Txt>
    );
  }
  return (
    <ul className={s.hostRow} aria-label="내 호스트">
      {hostRow.hosts.map((h) => (
        <li key={h.hostId}>
          <DrawerLink link={{ href: h.href }} className={s.host} onSame={onSame}>
            <Avatar size={60} src={h.profileImageUrl} />
            <Txt typography="labelSm" lines={2} className={s.hostName}>
              {h.name}
            </Txt>
          </DrawerLink>
        </li>
      ))}
      {hostRow.more && (
        <li>
          <DrawerLink link={{ href: hostRow.more.href }} className={s.host} onSame={onSame}>
            <span className={s.moreCircle}>
              <Icon name="more" />
            </span>
            <Txt typography="labelSm" lines={2} className={s.hostName}>
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
}: {
  link: Pick<ShellLink, 'href'>;
  className: string;
  onSame: () => void;
  children: ReactNode;
}) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const url = new URL(link.href, window.location.href);
    if (url.pathname === window.location.pathname && url.search === window.location.search) {
      e.preventDefault();
      onSame();
    }
  };
  return (
    <Link href={link.href} replace className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
