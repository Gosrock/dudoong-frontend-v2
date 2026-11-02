import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 총 결제금액 위 선 — 행 안쪽 여백(space 5)만큼 들인다 */
export const totalDivider = style({
  height: 1,
  margin: `0 ${vars.space[5]}`,
  background: vars.color.surface.defaultBorder,
});
