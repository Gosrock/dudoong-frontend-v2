'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { useShellMenu } from '@/features/shared/shell/model/useShellMenu';
import { ShellMenuButton } from '@/features/shared/shell/ShellMenuButton';
import { ShellAccountMenu, ShellRetry } from '@/features/shared/shell/ShellParts';
import { button } from '@/ui/components/Button/Button.css';
import { Header } from '@/ui/components/Header/Header';
import { TopBar, TopBarIconLink } from '@/ui/components/TopBar/TopBar';
import { Icon } from '@/ui/icons/Icon';

import * as s from './AudienceShell.css';

/** PC 상단 바 글자 메뉴 — 와이어 `626:19888`(둘 다 검정, 지금 있는 곳 표시 없음 — 사용자 결정 2026-10-31). 익명이 "공연 준비하기"를 누르면 호스팅 게이트가 로그인으로 보낸다 */
const NAV = [
  { key: 'browse', label: '공연 둘러보기', href: '/events' },
  { key: 'hosting', label: '공연 준비하기', href: '/hosting' },
];

/**
 * 관객 셸(plan P4s V — 와이어 근거, design-workflow §3). 서버와 브라우저가 같은 DOM을 그리고 CSS가 하나만 보인다(patterns §1):
 * - 1024 미만: 로고 헤더(와이어 `128:738` — ☰ · 로고 · 검색 · 티켓) + 햄버거 드로어
 * - 1024 이상: PC 상단 바(와이어 `626:19888` 로그인 전 · `640:17991` 로그인 후 — 로고 · 글자 메뉴 · 검색 · [로그인] / 아바타 ▾)
 *
 * 하위 화면(주문내역 등)은 페이지가 `AudienceSubHeader`(뒤로가기 + 제목)를 두면 로고 헤더가 숨는다(CSS `:has`).
 * 공연 리스트는 `NO_SEARCH_ATTR`를 두어 검색 아이콘을 숨긴다 — 선택자가 아이콘의 `href`·`aria-label`("공연 검색")을 쓴다.
 * 경로를 읽지 않고, children 위에 Suspense를 두지 않는다 — `(public)` 404 상태 코드 유지(tech-decisions §2).
 */
export function AudienceShell({ children }: { children: ReactNode }) {
  return (
    <div className={s.root}>
      <div className={s.mobileHeader}>
        <Header
          logo="audience"
          leading={<ShellMenuButton />}
          trailing={
            <>
              <TopBarIconLink
                linkAs={Link}
                href="/events"
                aria-label="공연 검색"
                icon={<Icon name="search" />}
              />
              <TopBarIconLink
                linkAs={Link}
                href="/tickets"
                aria-label="티켓"
                icon={<Icon name="ticket" />}
              />
            </>
          }
        />
      </div>
      <TopBar
        className={s.desktopOnly}
        linkAs={Link}
        logoHref="/"
        nav={NAV}
        plainNav
        trailing={
          <>
            <TopBarIconLink
              linkAs={Link}
              href="/events"
              aria-label="공연 검색"
              icon={<Icon name="search" />}
            />
            <AudienceAccount />
          </>
        }
      />
      <div className={s.body}>{children}</div>
    </div>
  );
}

/** PC 오른쪽 끝 — 세션이면 아바타 ▾, 익명이면 [로그인], 확인 중이면 같은 높이의 빈 자리 */
function AudienceAccount() {
  const state = useShellMenu();
  if (state.status === 'error') return <ShellRetry state={state} />;
  if (state.status === 'pending') return <span className={s.accountPending} aria-hidden />;
  if (state.menu.kind === 'anonymous') {
    return (
      <Link href={state.menu.login.href} className={button({ variant: 'secondary', size: 'sm' })}>
        로그인
      </Link>
    );
  }
  return <ShellAccountMenu menu={state.menu} state={state} />;
}
