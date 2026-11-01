import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * PC 제목 "{닉네임}님의 공연 준비 홈"(plan P10a) — 모바일은 로고 헤더가 대신해 눈에서는 감추고,
 * 화면 읽기 도구에는 h1로 남긴다(P14 접근성 — 흐름 밖이라 `page`의 gap도 먹지 않는다)
 */
export const desktopTitle = style({
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  '@media': {
    [media.desktop]: {
      position: 'static',
      width: 'auto',
      height: 'auto',
      overflow: 'visible',
      clip: 'auto',
      whiteSpace: 'normal',
      display: 'block',
      paddingTop: vars.space[8],
    },
  },
});

export const page = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  paddingBottom: vars.space[10],
});

/** 탭 + (검색) + [새 … 만들기] 한 줄 */
export const tabRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
});

export const tabList = style({ flex: 1, minWidth: 0 });

export const iconButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 40,
  height: 40,
  padding: 0,
  border: 'none',
  borderRadius: vars.radius.full,
  background: 'transparent',
  color: vars.color.text.primaryLabel,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: vars.color.surface.container },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}` },
  },
});

export const searchRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
});

export const searchField = style({ flex: 1, minWidth: 0 });

/**
 * [+ 새 공연/호스트 만들기] — 같은 DOM 하나를 모바일은 오른쪽 아래 고정(FAB 자리, 와이어 `424:11664`), PC는 탭 줄 오른쪽(plan P10a PC)에 둔다.
 */
export const createAction = style({
  position: 'fixed',
  right: vars.space[5],
  bottom: `calc(${vars.space[5]} + env(safe-area-inset-bottom))`,
  zIndex: vars.zIndex.header,
  textDecoration: 'none',
  '@media': {
    [media.desktop]: { position: 'static', zIndex: 'auto' },
  },
});

export const listArea = style({ display: 'flex', flexDirection: 'column', gap: vars.space[3] });

export const centered = style({ paddingTop: vars.space[9] });

/** 탭 줄과 목록 사이 */
export const panel = style({ paddingTop: vars.space[4] });
