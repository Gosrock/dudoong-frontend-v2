import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 와이어 `121:2026` 행(테두리 상자 + 아이콘 + 값)을 DS 토큰으로 */
export const list = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
});

export const row = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  width: '100%',
  padding: `${vars.space[3]} ${vars.space[4]}`,
  border: `1px solid ${vars.color.surface.defaultBorder}`,
  borderRadius: vars.radius[2],
  color: vars.color.text.primary,
  textDecoration: 'none',
  selectors: {
    'a&:hover': { background: vars.color.surface.container },
  },
});

export const icon = style({ display: 'inline-flex', flexShrink: 0 });

export const text = style({ flex: 1, minWidth: 0 });

export const loginHint = style({ flexShrink: 0, textDecoration: 'underline' });
