import { globalStyle, style } from '@vanilla-extract/css';

import { fixedBar } from '@/features/shared/shell/shell.css';
import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 새 티켓 만들기 · 티켓 수정 — 모바일(GUI `767:46560`·`767:46664`·`821:23712`): 좌우 24 · 위 12, 칸 묶음 위아래 16 · 사이 16.
 * PC(`821:25116`·`821:25649`): 위 28(→ 24) · 좌우 24, "< 티켓 관리" + 제목 `Heading/lg-emphasized`, 1280~ 두 열 — 왼쪽 칸 | 48 | 오른쪽 회색 판 557
 * (토글 넷 + 판매 기간, 모서리 20 · 채움 `surface/container`, 토글 사이 선). 1024~1279는 한 열(최대 600 — 기본 정보와 같음)
 */
export const page = style({ display: 'flex', flexDirection: 'column', flex: '1 0 auto' });

export const mobileOnly = style({ '@media': { [media.desktop]: { display: 'none' } } });

/** ← 제목 헤더 — 공연 헤더 대신이라 그것처럼 위에 고정(fix-qa-1101) */
export const mobileHeaderBar = style([fixedBar, mobileOnly]);

export const body = style({
  flex: '1 0 auto',
  padding: `${vars.space[3]} ${vars.space[5]} ${vars.space[6]}`,
  '@media': { [media.desktop]: { padding: `${vars.space[5]} ${vars.space[5]} ${vars.space[7]}` } },
});

/**
 * PC 머리 — "< 티켓 관리". 바로 아래 제목(`title`)과 간격 0, 제목 아래 24(GUI `821:25145` 세로 간격 0 · 아래 24 —
 * Figma 전수조사 2026-11-07에 여기 아래 24를 뺐다). 모바일은 헤더가 제목을 맡는다
 */
export const desktopHead = style({
  display: 'none',
  '@media': { [media.desktop]: { display: 'flex' } },
});

export const crumb = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[1],
  alignSelf: 'flex-start',
  color: vars.color.text.secondaryLabel,
  textDecoration: 'none',
  selectors: { '&:hover': { color: vars.color.text.primaryLabel } },
});

/** 제목 h1 — PC는 머리 안에 보이고, 모바일은 헤더(`p`)가 글자를 맡아 화면 읽기 도구에만 남긴다(P14 접근성) */
export const title = style({
  margin: 0,
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
      display: 'flex',
      flexDirection: 'column',
      gap: vars.space[1],
      paddingBottom: vars.space[5],
    },
  },
});

export const notices = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  paddingBottom: vars.space[2],
});

export const columns = style({
  display: 'flex',
  flexDirection: 'column',
  '@media': {
    [media.desktop]: { maxWidth: 600 },
    [media.desktopS]: {
      maxWidth: 'none',
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 557px)',
      // 2행은 환불 의무 동의(왼쪽 열 계좌 아래 — GUI `821:25116`). 남는 높이는 2행이 받아 1행(왼쪽 칸)이 늘지 않는다
      gridTemplateRows: 'auto 1fr',
      columnGap: vars.space[7],
      alignItems: 'start',
    },
  },
});

export const left = style({ display: 'flex', flexDirection: 'column', minWidth: 0 });

/** 오른쪽 판 — 모바일은 배경 없이 칸 묶음, 1280~ 회색 판(패딩 20 → 24 · 모서리 20) */
export const right = style({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  '@media': {
    [media.desktopS]: {
      gridColumn: '2',
      gridRow: '1 / span 2',
      alignSelf: 'start',
      padding: `${vars.space[2]} ${vars.space[5]}`,
      borderRadius: vars.radius[6],
      background: vars.color.surface.container,
    },
  },
});

/** PC 판 안 토글 사이 선(`821:25747` 테두리 `surface/default-border`) */
globalStyle(`${right} > *:not(:last-child)`, {
  '@media': {
    [media.desktopS]: { borderBottom: `1px solid ${vars.color.surface.defaultBorder}` },
  },
});

/** 하단 바 — 모바일 위아래 36(→ 32) · 좌우 24 Large 꽉, PC 위 선 + 오른쪽 Primary medium 342(`821:25779`) */
export const bottomBar = style({
  position: 'sticky',
  bottom: 0,
  zIndex: 1,
  marginTop: 'auto',
  background: vars.color.background.normal,
  padding: `${vars.space[6]} ${vars.space[5]}`,
  paddingBottom: `calc(${vars.space[6]} + env(safe-area-inset-bottom))`,
  '@media': {
    [media.desktop]: {
      display: 'flex',
      justifyContent: 'flex-end',
      padding: vars.space[5],
      borderTop: `1px solid ${vars.color.surface.defaultBorder}`,
    },
  },
});

export const saveButton = style({
  '@media': {
    [media.desktop]: {
      selectors: { '&&': { width: 342, height: 46, borderRadius: vars.radius[3] } },
    },
  },
});
