import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 결제정보 첫 줄 아래 닉네임 안내(이슈 #106 §4) — InfoRow와 같은 좌우 24 */
export const depositorHint = style({
  padding: `${vars.space[2]} ${vars.space[5]} ${vars.space[3]}`,
});

/** 입금 확인 다이얼로그 안 요약(DS `다이얼로그 - 결제 요약` `772:1195` 회색 판 — 모서리 12 · 패딩 16) */
export const summaryBox = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  padding: vars.space[4],
  borderRadius: vars.radius[4],
  background: vars.color.surface.container,
});

export const summaryRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.space[3],
  minWidth: 0,
});

export const summaryValue = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
  minWidth: 0,
  textAlign: 'right',
  overflowWrap: 'anywhere',
});
