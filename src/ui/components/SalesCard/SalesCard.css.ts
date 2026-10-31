import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';

/**
 * 디자인 시스템 `티켓 판매 정보`(`627:1864` — `판매 후` `605:1666` / `판매 전` `627:1863`). 배경 #F7F7F6 · 모서리 20 ·
 * 패딩 16 · 20 · 4. 제목 `Heading/md2 - emphasized` → 도넛 104 + 간격 32 + 범례(점 12 + 간격 12 + `Label/sm` 1줄 말줄임, 줄 간격 4)
 * → 위 선 #EEEEED · 위아래 12 · 오른쪽 정렬 "판매 장수 n  총액 n"(`Label/md` + `Heading/lg-emphasized`, 간격 8).
 */
export const card = style({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  padding: `${vars.space[4]} ${vars.space[5]} ${vars.space[1]}`,
  boxSizing: 'border-box',
  borderRadius: vars.radius[6],
  background: vars.color.surface.container,
});

/** 도넛 + 범례 줄 — 위 20(→ 24) · 아래 16 · 왼쪽 8 */
export const chartRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[6],
  padding: `${vars.space[5]} 0 ${vars.space[4]} ${vars.space[2]}`,
});

export const donut = style({ display: 'block', flexShrink: 0, width: 104, height: 104 });

export const legend = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  minWidth: 0,
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

export const legendItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  minWidth: 0,
});

export const dot = style({
  flexShrink: 0,
  width: 12,
  height: 12,
  borderRadius: vars.radius.full,
});

/** 합계 줄 — 위 선, 오른쪽 정렬, 위아래 12. 좁으면 줄바꿈 */
export const totals = style({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  alignItems: 'baseline',
  columnGap: vars.space[2],
  rowGap: vars.space[1],
  padding: `${vars.space[3]} 0`,
  borderTop: `1px solid ${vars.color.surface.imageBg}`,
});

export const total = style({ display: 'inline-flex', alignItems: 'baseline', gap: vars.space[2] });

/** 판매 전 — 가운데 문구(Figma 위 47 · 아래 56 → 48 · 48 토큰, 남는 높이는 가운데로) */
export const empty = style({
  flex: '1 0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${vars.space[8]} 0`,
});
