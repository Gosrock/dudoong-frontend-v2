import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

export const form = style({ flex: '1 0 auto', display: 'flex', flexDirection: 'column' });

/** 옵션 응답 영역(GUI `567:9738` 390 · 채움 `#F7F7F6` 변수 — 패딩 24 · 옵션 사이 선) */
export const optionBox = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  padding: `${vars.space[4]} ${vars.space[5]} ${vars.space[5]}`,
  background: vars.color.surface.container,
});

export const errorBanner = style({
  margin: `${vars.space[3]} ${vars.space[5]} 0`,
  padding: `${vars.space[3]} ${vars.space[4]}`,
  borderRadius: vars.radius[2],
  background: vars.color.status.warningSubtle,
});

/** 하단 동의 + CTA(GUI 프레임 맨 아래). 길어도 늘 보이게 붙여 둔다 */
export const bottomBar = style({
  position: 'sticky',
  bottom: 0,
  zIndex: 1,
  marginTop: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  padding: `${vars.space[5]} ${vars.space[5]}`,
  paddingBottom: `calc(${vars.space[5]} + env(safe-area-inset-bottom))`,
  background: vars.color.background.normal,
});
