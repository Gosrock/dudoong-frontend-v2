import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/**
 * 로그인·세션 만료(와이어 `218:4792`) — 셸 본문 높이를 채우고 가운데에 말풍선 + 캐릭터 + 버튼을 세운다.
 * 크기는 와이어 값: 캐릭터 자리 285(DS `img_login` 원래 크기), 버튼 폭 268(390 프레임 안).
 */
export const main = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: vars.space[7],
  padding: `${vars.space[9]} ${vars.space[4]}`,
});

/** 말풍선(Tooltip)의 기준 — 캐릭터 위 가운데. 늘 열린 말풍선이 붙을 자리를 위해 위 간격을 둔다 */
export const character = style({
  display: 'inline-flex',
  marginTop: vars.space[8],
});

export const action = style({
  display: 'flex',
  justifyContent: 'center',
  width: '100%',
  maxWidth: 268,
});
