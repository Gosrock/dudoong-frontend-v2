'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSelectedLayoutSegment } from 'next/navigation';
import { overlay } from 'overlay-kit';
import { Suspense } from 'react';

import { eventDashboardQuery } from '@/api/dashboard/queries';
import type { EventMenuKey } from '@/features/hosting/shared/model/event-scope';
import { eventMetaLineOf } from '@/features/hosting/shared/model/home-cards';
import type { useEventScope } from '@/features/hosting/shared/model/useEventScope';
import { UNNAMED_EVENT } from '@/features/shared/event-labels';
import { useShellMenu } from '@/features/shared/shell/model/useShellMenu';
import { ShellBell } from '@/features/shared/shell/ShellParts';
import { Drawer } from '@/ui/components/Drawer/Drawer';
import { DropdownMenu } from '@/ui/components/DropdownMenu/DropdownMenu';
import { Header, HeaderIconButton } from '@/ui/components/Header/Header';
import { SidebarMenuItem } from '@/ui/components/SidebarMenu/SidebarMenu';
import { Icon } from '@/ui/icons/Icon';
import type { IconSpec } from '@/ui/icons/registry';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { newBadgeCountOf } from '../model/dashboard-stats';
import * as s from './EventScopeNav.css';

type Scope = ReturnType<typeof useEventScope>;

/** 메뉴 아이콘 — GUI 사이드바(`748:34025`·`767:39645`). 대시보드만 선택일 때 filled(`91:912`), 나머지는 선택이어도 outline(Figma 그대로) */
const MENU_ICON: Record<EventMenuKey, IconSpec> = {
  dashboard: { name: 'dashboard' },
  info: { name: 'info' },
  detail: { name: 'detail' },
  tickets: { name: 'ticket' },
  guests: { name: 'people' },
  qr: { name: 'qr' },
};

/** `/hosting/events/[id]/<여기>` — 공연 레이아웃 바로 아래 세그먼트. `tickets/new`도 `tickets` */
function useActiveMenuKey(): EventMenuKey | null {
  return useSelectedLayoutSegment() as EventMenuKey | null;
}

/**
 * 예매자 관리 배지(GUI `사이드바 메뉴` `alert`) — 승인 대기 주문 수(Q39 8번 기본안 · `newBadgeCountOf`, GD-1). 등록 후만 읽는다.
 * 실패·로딩이면 배지 없음
 */
function useGuestsBadge(scope: Scope) {
  const { data } = useQuery({
    ...eventDashboardQuery(scope.event.eventId),
    enabled: scope.registered,
  });
  return data ? newBadgeCountOf(data) : 0;
}

function EventSidebarBody({
  scope,
  active,
  inOverlay,
}: {
  scope: Scope;
  active: EventMenuKey | null;
  /**
   * 드로어 안 — 이동은 `replace`(patterns §6, 오버레이 history 항목 위에 쌓지 않는다). 경로가 바뀌면 `OverlayRouteReset`이 닫는다.
   * 지금 화면 메뉴를 누르면 경로가 안 바뀌므로 그때만 직접 닫는다
   */
  inOverlay?: { close: () => void };
}) {
  const { event } = scope;
  const badge = useGuestsBadge(scope);
  return (
    <>
      {/* GUI `사이드바_공연 정보`(`1861:2065`, Design Sync #335 — 2026-11-21): "← 내 공연" · 공연명 · 호스트 · D-n(포스터 카드 대신) */}
      <div className={s.info} data-testid="event-card">
        <Link href="/hosting" className={s.back} replace={Boolean(inOverlay)}>
          <Icon name="backward" />
          <Txt typography="labelMd">내 공연</Txt>
        </Link>
        <Flex direction="column" gap={1} style={{ minWidth: 0 }}>
          <Txt typography="headingMd2Emphasized" color={colors.textInverse} lines={2}>
            {event.name ?? UNNAMED_EVENT}
          </Txt>
          <Txt typography="bodyMd" color={colors.textSecondary} lines={1}>
            {eventMetaLineOf(event)}
          </Txt>
        </Flex>
      </div>
      <div className={s.cardAndMenu}>
        <ul className={s.menu}>
          {scope.menu.map((m) => {
            const selected = m.key === active;
            return (
              <li key={m.key}>
                <SidebarMenuItem
                  linkAs={Link}
                  href={m.href}
                  selected={selected}
                  replace={Boolean(inOverlay)}
                  onClick={selected ? inOverlay?.close : undefined}
                  icon={
                    selected && m.key === 'dashboard' ? (
                      <Icon name="dashboard" variant="filled" />
                    ) : (
                      <Icon {...MENU_ICON[m.key]} />
                    )
                  }
                  badge={m.key === 'guests' ? badge : undefined}
                  badgeLabel={m.key === 'guests' ? `승인 대기 ${badge}건` : undefined}
                >
                  {m.label}
                </SidebarMenuItem>
              </li>
            );
          })}
        </ul>
      </div>
      {scope.publicHref && (
        <Link href={scope.publicHref} className={s.publicLink} target="_blank" rel="noopener">
          <Icon name="pop-out" />
          <Txt typography="labelLg">공연 페이지 보기</Txt>
        </Link>
      )}
    </>
  );
}

function ActiveSidebar({ scope }: { scope: Scope }) {
  return <EventSidebarBody scope={scope} active={useActiveMenuKey()} />;
}

/**
 * PC 공연 사이드바(268, 1024~). 활성 메뉴는 `useSelectedLayoutSegment` 말단 + 자체 Suspense(patterns §6) —
 * 대기 중에는 활성 표시 없이 같은 메뉴를 그린다.
 */
export function EventSidebar({ scope }: { scope: Scope }) {
  return (
    <nav
      aria-label="공연 메뉴"
      className={`${s.sidebar} ${s.desktopSidebar}`}
      data-testid="event-sidebar"
    >
      <Suspense fallback={<EventSidebarBody scope={scope} active={null} />}>
        <ActiveSidebar scope={scope} />
      </Suspense>
    </nav>
  );
}

/**
 * 모바일 공연 헤더 — GUI `727:23088`·`748:33351`·`767:39585`의 Top app bar(Default, leading icon, 공연 전환형):
 * ☰ + "<지금 메뉴> ▾ / 공연명" + 벨. 누른 상태는 Figma에 없다 — Q37 기본안: ☰ → 공연 메뉴 드로어, 제목 ▾ → 공연 전환 시트.
 */
export function EventMobileHeader({ scope }: { scope: Scope }) {
  return (
    <div className={s.mobileHeader}>
      <Suspense fallback={<EventMobileHeaderBody scope={scope} active={null} />}>
        <ActiveMobileHeader scope={scope} />
      </Suspense>
    </div>
  );
}

function ActiveMobileHeader({ scope }: { scope: Scope }) {
  return <EventMobileHeaderBody scope={scope} active={useActiveMenuKey()} />;
}

function EventMobileHeaderBody({ scope, active }: { scope: Scope; active: EventMenuKey | null }) {
  const router = useRouter();
  const label = scope.menu.find((m) => m.key === active)?.label ?? '공연 관리';
  const name = scope.event.name ?? UNNAMED_EVENT;
  return (
    <Header
      titleAs="div"
      title={label}
      switcher={{
        subtitle: name,
        'aria-label': `${label} — ${name}. 공연 화면 바꾸기`,
        // GUI `대시보드_드롭다운 오픈`(`1880:34018`, Design Sync #321 — 2026-11-21): ▾는 이 공연의 화면 메뉴(DS `dropdown item`
        // `size=larger`, 고른 화면 ✓). 전에는 디자인 없이 "다른 공연으로 바꾸기" 시트였다 — 다른 공연은 ☰ → "← 내 공연"으로
        wrap: (button) => (
          <DropdownMenu
            trigger={button}
            align="start"
            size="larger"
            items={scope.menu.map((m) => ({
              label: m.label,
              selected: m.key === active,
              onSelect: () => router.push(m.href),
            }))}
          />
        ),
      }}
      leading={
        <HeaderIconButton
          aria-label="공연 메뉴 열기"
          icon={<Icon name="menu" />}
          onClick={() => openEventMenuDrawer(scope, active)}
        />
      }
      trailing={<HeaderBell />}
    />
  );
}

function HeaderBell() {
  return <ShellBell state={useShellMenu()} />;
}

/** ☰ → 공연 메뉴 드로어(디자인 없음 — PC 사이드바와 같은 내용, design-requests 기본안). 경로가 바뀌면 `OverlayRouteReset`이 내린다 */
function openEventMenuDrawer(scope: Scope, active: EventMenuKey | null) {
  overlay.open(({ isOpen, close, unmount }) => (
    <Drawer
      open={isOpen}
      onOpenChange={(o) => !o && close()}
      onExited={unmount}
      title="공연 메뉴"
      headerTrailing={<HeaderBell />}
    >
      <nav aria-label="공연 메뉴" className={`${s.sidebar} ${s.drawerSidebar}`}>
        <EventSidebarBody scope={scope} active={active} inOverlay={{ close }} />
      </nav>
    </Drawer>
  ));
}

/** 읽기 전용 안내(일반 멤버 · 끝난 공연) — 디자인 없음. 본문 위 회색 줄 */
export function ReadOnlyNotice({ message }: { message: string }) {
  return (
    <p className={s.readOnly} data-testid="read-only">
      <Icon name="info" />
      <Txt typography="bodyMd">{message}</Txt>
    </p>
  );
}
