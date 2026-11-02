import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 입금 안내 묶음 — 완료 화면 390폭 안에서 꽉 채운다 */
export const box = style({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: vars.radius[2],
  background: vars.color.surface.container,
  paddingBlock: vars.space[2],
});

export const footer = style({ padding: `${vars.space[2]} ${vars.space[5]} ${vars.space[3]}` });
