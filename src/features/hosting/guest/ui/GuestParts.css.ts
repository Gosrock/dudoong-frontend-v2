import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/** 상태 칩 줄 — 간격 8, 모바일은 넘치면 가로 스크롤(와이어 6개가 390을 넘는다) */
export const filters = style({
  display: 'flex',
  gap: vars.space[2],
  overflowX: 'auto',
  paddingBottom: vars.space[1],
  scrollbarWidth: 'none',
  '@media': { [media.desktop]: { flexWrap: 'wrap', overflowX: 'visible' } },
});

export const search = style({ display: 'flex', flexDirection: 'column', gap: vars.space[2] });

/** [기준 ▾] [검색어] [검색] — 모바일은 검색어 칸이 남은 폭, PC는 최대 폭(와이어 380) */
export const searchRow = style({ display: 'flex', alignItems: 'center', gap: vars.space[2] });

export const searchType = style({ flex: '0 0 auto', width: 112 });

export const searchInput = style({
  flex: '1 1 auto',
  minWidth: 0,
  '@media': { [media.desktop]: { flex: '0 1 380px' } },
});

export const notice = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
});

export const noticeClose = style({
  display: 'inline-flex',
  padding: vars.space[1],
  border: 0,
  background: 'none',
  color: vars.color.text.secondaryLabel,
  cursor: 'pointer',
  borderRadius: vars.radius[1],
});

export const footer = style({
  display: 'flex',
  justifyContent: 'flex-end',
});

export const detailCell = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[1],
  whiteSpace: 'nowrap',
});
