import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/** 주문 완료 — GUI `939:27829`(390). 내용 묶음을 화면 가운데쯤(위 여백)에, PC는 같은 묶음을 가운데 390폭으로 */
export const page = style({
  flex: '1 0 auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: `${vars.space[10]} ${vars.space[5]}`,
});

export const content = style({
  maxWidth: 390,
  '@media': { [media.desktop]: { paddingTop: vars.space[7] } },
});

/** 두 버튼 같은 폭, 간격 12(GUI 버튼 166 · 164 — 반올림) */
export const actions = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: vars.space[3],
  width: '100%',
});
