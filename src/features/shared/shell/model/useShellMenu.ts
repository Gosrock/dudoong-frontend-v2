'use client';

import { useMemo } from 'react';

import { useLoginHref } from '@/features/shared/auth/LoginRequiredLink';
import { useLogout } from '@/features/shared/auth/useLogout';
import { useSession } from '@/features/shared/auth/useSession';
import { useNotificationBell } from '@/features/shared/notification/model/useNotificationBell';

import { type ShellMenu, shellMenu } from './shell-menu';

export type ShellMenuState =
  /** 세션 확인 중 — 사용자별 줄은 비활성 자리표시(patterns §4-2). 요청은 GM-1 하나뿐이다 */
  | { status: 'pending' }
  /** GM-1 5xx·네트워크. 공개 화면의 셸은 화면을 막지 않고 다시 시도만 둔다 */
  | { status: 'error'; retry: () => void }
  | {
      status: 'ready';
      menu: ShellMenu;
      /** 빨간 점(GN-2 `count > 0`). 익명·확인 전·실패면 false */
      hasUnread: boolean;
      /** 햄버거·드롭다운을 열 때 부른다(벨을 다시 읽는다). 익명이면 아무것도 하지 않는다 */
      refreshBell: () => void;
      /** 로그인일 때만. `useLogout` 그대로 — 진행 중인 변경이 있으면 `disabled` */
      logout: ReturnType<typeof useLogout> | null;
    };

/**
 * 셸 메뉴 상태(plan P4s-L). 관객 햄버거 · 관객 PC 아바타 드롭다운 · 호스팅 드로어 · 호스팅 PC 아바타 드롭다운이 같이 쓴다.
 * UI 동작(열기·닫기)은 없다 — 데이터와 동작만 돌려준다(plan §0).
 *
 * - 세션은 `useSession`(GM-1, 캐시 한 벌), 벨은 `useNotificationBell`(P9b, 세션일 때만 GN-2), 로그아웃은 `useLogout`(P4a)
 * - 익명의 [로그인]은 지금 주소로 돌아오는 `/login?redirect=…`(`useLoginHref` — 서버·하이드레이션 때는 `/login`)
 */
export function useShellMenu(): ShellMenuState {
  const session = useSession();
  const bell = useNotificationBell();
  const logout = useLogout();
  const loginHref = useLoginHref();
  const me = session.me;

  const menu = useMemo(() => {
    if (me === undefined) return null;
    const m = shellMenu(me);
    return m.kind === 'anonymous' ? { ...m, login: { ...m.login, href: loginHref } } : m;
  }, [me, loginHref]);

  if (session.status === 'error') return { status: 'error', retry: session.retry };
  if (!menu) return { status: 'pending' };
  return {
    status: 'ready',
    menu,
    hasUnread: bell.hasUnread,
    refreshBell: bell.refresh,
    logout: menu.kind === 'session' ? logout : null,
  };
}
