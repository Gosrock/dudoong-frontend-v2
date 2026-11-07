import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 주문상세(`OrderDetailView`) 조각 모양 — GUI `1175:19046` · `1175:19358` · `1175:19628` */

/** 주문 요약(gui `1175:19365` — 위아래 12 · 좌우 24) */
export const summary = style({
  padding: `${vars.space[3]} ${vars.space[5]}`,
});

/** 옵션 응답 판(gui `1175:19385` — 채움 `surface/container` · 위아래 12 · 좌우 24 · 간격 16) */
export const optionBox = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  padding: `${vars.space[3]} ${vars.space[5]}`,
  background: vars.color.surface.container,
});

/** 승인거절 사유 설명 줄(gui `1175:19927` — 아래 선 · 위아래 12 · 좌우 24, 설명 + 문의 버튼 56) */
export const refuseBody = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  padding: `${vars.space[3]} ${vars.space[5]}`,
  borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
});

/** 주문상세 결제정보 아래 [토스 앱에서 송금하기](B23) — 행 좌우 여백에 맞춘다 */
export const tossTransfer = style({
  padding: `${vars.space[2]} ${vars.space[5]} ${vars.space[3]}`,
});
