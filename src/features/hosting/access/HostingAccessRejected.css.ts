import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 안내를 본문 위쪽 가운데에 — 공연준비 홈 빈 상태와 같은 위 여백 */
export const root = style({
  display: 'flex',
  justifyContent: 'center',
  paddingTop: vars.space[9],
  paddingBottom: vars.space[9],
});
