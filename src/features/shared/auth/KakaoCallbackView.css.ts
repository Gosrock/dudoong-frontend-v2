import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 카카오 콜백 — 디자인 없음. 셸 본문 높이를 채우고 대기·실패 안내를 가운데에 둔다(로그인 화면과 같은 배치) */
export const main = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${vars.space[9]} ${vars.space[4]}`,
});
