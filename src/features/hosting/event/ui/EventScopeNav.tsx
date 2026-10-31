'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import { overlay } from 'overlay-kit';
import { Suspense } from 'react';

import { eventDashboardQuery } from '@/api/dashboard/queries';
import { myEventsQuery } from '@/api/event/queries';
import { eventChipOf, UNNAMED_EVENT } from '@/features/hosting/home/model/home-cards';
import { useShellMenu } from '@/features/shared/shell/model/useShellMenu';
import { ShellBell } from '@/features/shared/shell/ShellParts';
import { BottomSheet } from '@/ui/components/BottomSheet/BottomSheet';
import { Button } from '@/ui/components/Button/Button';
import { Chip } from '@/ui/components/Chip/Chip';
import { Drawer } from '@/ui/components/Drawer/Drawer';
import { Header, HeaderIconButton } from '@/ui/components/Header/Header';
import { SidebarMenuItem } from '@/ui/components/SidebarMenu/SidebarMenu';
import { Icon } from '@/ui/icons/Icon';
import type { IconSpec } from '@/ui/icons/registry';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { newBadgeCountOf } from '../model/dashboard-stats';
import type { EventMenuKey } from '../model/event-scope';
import type { useEventScope } from '../model/useEventScope';
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
      <Link href="/hosting" className={s.back} replace={Boolean(inOverlay)}>
        <Icon name="chevron-left" />
        <Txt typography="labelLg">내 공연</Txt>
      </Link>
      <div className={s.cardAndMenu}>
        <div className={s.card} data-testid="event-card">
          {event.posterImageUrl ? (
            // 업로드 포스터를 그대로 그린다(공연준비 홈 카드와 같다 — v1 #378 `/_next/image` 차단)
            // eslint-disable-next-line @next/next/no-img-element
            <img className={s.poster} src={event.posterImageUrl} alt="" decoding="async" />
          ) : (
            <Illustration name="poster-placeholder" width={48} className={s.poster} />
          )}
          <Flex direction="column" gap={1} style={{ minWidth: 0 }}>
            <Txt typography="headingSmEmphasized" color={colors.textInverse} lines={2}>
              {event.name ?? UNNAMED_EVENT}
            </Txt>
            <Txt typography="bodyMd" color={colors.textSecondary} lines={1}>
              {[event.hostName, event.dDay !== null ? `D-${event.dDay}` : null]
                .filter(Boolean)
                .join(' · ')}
            </Txt>
          </Flex>
        </div>
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
  const label = scope.menu.find((m) => m.key === active)?.label ?? '공연 관리';
  const name = scope.event.name ?? UNNAMED_EVENT;
  return (
    <Header
      titleAs="div"
      title={label}
      switcher={{
        subtitle: name,
        'aria-label': `${label} — ${name}. 다른 공연으로 바꾸기`,
        onClick: () => openEventSwitchSheet(scope.event.eventId),
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

/** 제목 ▾ → 공연 전환 시트(디자인 없음, Q37 기본안). 내 공연(GE-1) 목록 — 고르면 그 공연의 대시보드로(시트 안 이동이라 `replace`) */
function openEventSwitchSheet(currentEventId: number) {
  overlay.open(({ isOpen, close, unmount }) => (
    <BottomSheet
      open={isOpen}
      onOpenChange={(o) => !o && close()}
      onExited={unmount}
      title="공연 바꾸기"
    >
      <EventSwitchList currentEventId={currentEventId} onPick={close} />
    </BottomSheet>
  ));
}

function EventSwitchList({
  currentEventId,
  onPick,
}: {
  currentEventId: number;
  onPick: () => void;
}) {
  const q = useInfiniteQuery(myEventsQuery());
  if (q.status === 'pending') {
    return (
      <Txt typography="bodyMd" color={colors.textSecondary}>
        불러오는 중
      </Txt>
    );
  }
  if (q.status === 'error') {
    return (
      <div role="alert">
        <Flex direction="column" gap={3} align="flex-start">
          <Txt typography="bodyMd">공연 목록을 불러오지 못했어요.</Txt>
          <Button variant="secondary" size="sm" onClick={() => void q.refetch()}>
            다시 시도
          </Button>
        </Flex>
      </div>
    );
  }
  const events = q.data.pages.flatMap((p) => p.content);
  return (
    <Flex direction="column" fullWidth>
      <ul className={s.menu} aria-label="내 공연">
        {events.map((e) => {
          const chip = eventChipOf(e);
          const current = e.eventId === currentEventId;
          return (
            <li key={e.eventId}>
              <Link
                href={`/hosting/events/${e.eventId}/dashboard`}
                replace
                className={s.switchRow}
                aria-current={current ? 'page' : undefined}
                onClick={current ? onPick : undefined}
              >
                <Flex direction="column" gap={1} style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <Txt typography={current ? 'labelLgEmphasized' : 'labelLg'} lines={1}>
                    {e.name ?? UNNAMED_EVENT}
                  </Txt>
                  {e.hostName && (
                    <Txt typography="bodySm" color={colors.textSecondary} lines={1}>
                      {e.hostName}
                    </Txt>
                  )}
                </Flex>
                {chip && (
                  <Chip color={chip.color} theme={chip.theme}>
                    {chip.label}
                  </Chip>
                )}
                {current && <Icon name="check" title="지금 공연" />}
              </Link>
            </li>
          );
        })}
      </ul>
      {q.hasNextPage && (
        <Button
          variant="secondary"
          size="sm"
          loading={q.isFetchingNextPage}
          onClick={() => void q.fetchNextPage()}
        >
          더 보기
        </Button>
      )}
    </Flex>
  );
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
