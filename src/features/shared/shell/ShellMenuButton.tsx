'use client';

import { HeaderIconButton } from '@/ui/components/Header/Header';
import { Icon } from '@/ui/icons/Icon';

import { useShellMenu } from './model/useShellMenu';

/**
 * 모바일 햄버거 버튼(관객 로고 헤더 · 호스팅 `host title`). 누르면 벨을 다시 읽고 드로어를 연다.
 * 드로어 모듈(`ShellDrawer`)은 누를 때 불러온다 — 셸은 모든 화면에 떠 있어 첫 번들을 가볍게 둔다.
 * `noticesHref` — 드로어 "서비스 업데이트 노트"가 갈 공지 목록(관객 `/notices` · 호스팅 `/hosting/notices`, P9c-V · Q4).
 */
export function ShellMenuButton({ noticesHref }: { noticesHref?: string } = {}) {
  const state = useShellMenu();
  return (
    <HeaderIconButton
      aria-label="메뉴 열기"
      icon={<Icon name="menu" />}
      onClick={() => {
        if (state.status === 'ready') state.refreshBell();
        void import('./ShellDrawer').then((m) => m.openShellDrawer({ noticesHref }));
      }}
    />
  );
}
