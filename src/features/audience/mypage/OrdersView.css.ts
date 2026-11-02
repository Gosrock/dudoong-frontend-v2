import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 목록 위 오른쪽 고정 라벨 줄("최근주문순" — Q36) */
export const toolbar = style({
  display: 'flex',
  justifyContent: 'flex-end',
  padding: `${vars.space[3]} ${vars.space[5]}`,
  borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
});

export const cardLink = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  padding: `${vars.space[4]} ${vars.space[5]}`,
  color: 'inherit',
  textDecoration: 'none',
});
