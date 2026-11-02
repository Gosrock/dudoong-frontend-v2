import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 주문상세(`OrderDetailView`) 조각 모양 */

/** 옵션 응답 영역(체크아웃 `optionBox`와 같은 회색 판) */
export const optionBox = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  padding: `${vars.space[4]} ${vars.space[5]} ${vars.space[5]}`,
  background: vars.color.surface.container,
});

/** 주문상세 결제정보 아래 [토스 앱에서 송금하기](B23) — 행 좌우 여백에 맞춘다 */
export const tossTransfer = style({
  padding: `${vars.space[2]} ${vars.space[5]} ${vars.space[3]}`,
});
