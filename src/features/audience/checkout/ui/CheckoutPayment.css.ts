import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 결제정보 첫 줄 아래 닉네임 안내(이슈 #106 §4) — InfoRow와 같은 좌우 24 */
export const depositorHint = style({
  padding: `${vars.space[2]} ${vars.space[5]} ${vars.space[3]}`,
});

/** 입금 확인 창 카드 묶음 — 카드 사이 16(GUI `567:9756` 묶음 간격 16) */
export const summaryCards = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
});

/** 흰 카드 — 흰 판 · 테두리 `surface/default-border` · 모서리 12 · 안쪽 없음(줄이 24 · 12를 가진다) */
export const summaryCard = style({
  overflow: 'hidden',
  border: `1px solid ${vars.color.surface.defaultBorder}`,
  borderRadius: vars.radius[4],
  background: vars.color.background.normal,
});
