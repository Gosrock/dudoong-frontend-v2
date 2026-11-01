import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';

/** 면 모양은 `floatingSurface`(`theme/surface.css.ts`) — 여기는 Popover 고유 크기·여백만 */
export const content = style({
  maxWidth: `min(320px, calc(100vw - ${vars.space[4]} * 2))`,
  padding: vars.space[4],
});

export const arrow = style({ fill: vars.color.background.normal });
