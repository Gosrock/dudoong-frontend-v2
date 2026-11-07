import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

export const root = style({ marginTop: vars.space[6] });

export const body = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  // 펼침 행 라벨과 같은 좌우 안쪽(Accordion 트리거 24)
  padding: `${vars.space[2]} ${vars.space[5]} ${vars.space[4]}`,
});

export const list = style({
  margin: 0,
  paddingLeft: vars.space[5],
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
});
