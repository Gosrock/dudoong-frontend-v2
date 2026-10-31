'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { useShellMenu } from '@/features/shared/shell/model/useShellMenu';
import { ShellMenuButton } from '@/features/shared/shell/ShellMenuButton';
import { ShellAccountMenu, ShellBell, ShellRetry } from '@/features/shared/shell/ShellParts';
import { Header } from '@/ui/components/Header/Header';
import { TopBar } from '@/ui/components/TopBar/TopBar';

import * as s from './HostingShell.css';

/** `Top bar_Host` 글자 메뉴 — 호스팅에서는 "공연 준비하기"가 지금 있는 곳(굵은 검정, GUI `712:1648`) */
const NAV = [
  { key: 'browse', label: '공연 둘러보기', href: '/events' },
  { key: 'hosting', label: '공연 준비하기', href: '/hosting', active: true },
];

/**
 * 호스팅 셸(plan P4s V). 로그인 게이트 안에서 그린다(`hosting/layout.tsx`).
 * - 1024 이상: 전역 상단 바 `Top bar_Host`(GUI Ready `712:1646` 등 안의 `712:1648`) — 로고 · 글자 메뉴 · 벨 · 아바타 ▾
 * - 1024 미만: 로고 헤더 `host title`(디자인 시스템 `619:2116` — ☰ + "dudoong host", 벨 없음 — Q17 로고형, 사용자 결정 2026-10-31) +
 *   햄버거 드로어(관객과 같은 메뉴, 벨은 드로어 머리 줄)
 * - 본문: 공연 밖 화면은 최대 1280(좌우 24 · 40 · 80 — `Container`). 공연 안(`[data-event-scope]`)은 폭 제한 없이 3단(사이드바 268 + 가운데 + 우측 패널)
 */
export function HostingShell({ children }: { children: ReactNode }) {
  return (
    <div className={s.root}>
      <div className={s.mobileHeader}>
        <Header logo="host" leading={<ShellMenuButton />} />
      </div>
      <TopBar
        className={s.desktopOnly}
        linkAs={Link}
        logoHref="/"
        nav={NAV}
        trailing={<HostingTopBarEnd />}
      />
      <div className={s.body}>{children}</div>
    </div>
  );
}

/** 벨 + 아바타 ▾. 게이트 안이라 늘 세션이다 — 확인 중·실패만 따로 */
function HostingTopBarEnd() {
  const state = useShellMenu();
  if (state.status === 'error') return <ShellRetry state={state} />;
  if (state.status === 'pending' || state.menu.kind !== 'session') {
    return <span className={s.accountPending} aria-hidden />;
  }
  return (
    <>
      <ShellBell state={state} />
      <ShellAccountMenu menu={state.menu} state={state} />
    </>
  );
}
