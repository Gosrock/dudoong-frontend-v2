import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 와이어 수준 — 배치만 토큰으로(design-workflow §3). 모양(색 강조·그림자·장식)은 더하지 않는다 */
const reset = {
  display: 'flex',
  alignItems: 'center',
  padding: 0,
  border: 0,
  background: 'transparent',
  color: vars.color.text.primaryLabel,
  textDecoration: 'none',
  font: 'inherit',
  cursor: 'pointer',
  borderRadius: vars.radius[2],
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
    '&:disabled': { color: vars.color.interaction.disabledText, cursor: 'not-allowed' },
  },
} as const;

/** 아이콘 24 + 글자 줄 */
export const row = style({ ...reset, gap: vars.space[4], minHeight: 40 });

export const shortcut = style({ ...reset, gap: vars.space[3], alignSelf: 'flex-start' });

export const profile = style({ ...reset, gap: vars.space[5], width: '100%' });

export const profileAvatar = style({ position: 'relative', display: 'inline-flex', flexShrink: 0 });

export const editBadge = style({
  position: 'absolute',
  right: 0,
  bottom: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  borderRadius: vars.radius.full,
  background: vars.color.background.darkFixed,
  color: vars.color.text.inverse,
});

export const editIcon = style({ width: 16, height: 16 });

export const profileText = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  minWidth: 0,
});

export const list = style({ margin: 0, padding: 0, listStyle: 'none' });

export const empty = style({ margin: 0 });

/** 호스트 아바타 줄 — 가로로 넘치면 스크롤(와이어 `128:2875`) */
export const hostRow = style({
  display: 'flex',
  gap: vars.space[4],
  margin: 0,
  padding: 0,
  listStyle: 'none',
  overflowX: 'auto',
  scrollbarWidth: 'none',
});

export const host = style({
  ...reset,
  flexDirection: 'column',
  gap: vars.space[2],
  width: 64,
});

export const hostName = style({ maxWidth: '100%' });

export const moreCircle = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 60,
  height: 60,
  borderRadius: vars.radius.full,
  border: `1px solid ${vars.color.surface.defaultBorder}`,
});

export const visuallyHidden = style({
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
});

globalStyle(`${row} > svg, ${shortcut} > svg`, { flexShrink: 0 });
