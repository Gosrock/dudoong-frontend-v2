import { style } from '@vanilla-extract/css';

import { sprinkles } from '@/ui/theme/sprinkles.css';
import { vars } from '@/ui/theme/tokens.css';

/** 연락처 목록 — 행 64가 사이 없이 이어진다(GUI `1481:7867`) */
export const list = style([
  sprinkles({ listStyle: 'none' }),
  { margin: 0, padding: 0, width: '100%', display: 'flex', flexDirection: 'column' },
]);

/** 연락처 행(GUI 로컬 "연락처 행" `1481:7193`) — 위아래 12, 아이콘–글자 12 */
export const row = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  width: '100%',
  minHeight: 64,
  padding: `${vars.space[3]} 0`,
  color: vars.color.text.primaryLabel,
  textDecoration: 'none',
});

export const rowLink = style({
  borderRadius: vars.radius[2],
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

/** 아이콘 원 36 · 채움 `surface/container`(GUI "연락처 아이콘") */
export const icon = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 36,
  height: 36,
  borderRadius: vars.radius.full,
  background: vars.color.surface.container,
});

/** 유형 · 값 — 사이 4 */
export const text = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  flex: 1,
  minWidth: 0,
});

/** 열기 > 20(GUI `1481:7173`) */
export const chevron = style({ width: 20, height: 20, flexShrink: 0 });

/** 로그인 안내 상자 — 채움 `surface/container` · 모서리 12 · 여백 16(GUI `1481:7908`) */
export const note = style({
  margin: 0,
  padding: vars.space[4],
  borderRadius: vars.radius[4],
  background: vars.color.surface.container,
});
