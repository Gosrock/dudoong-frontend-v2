import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/**
 * 티켓 선택(P6-V) — 와이어 근거(`528:2484`·`121:1406`·`121:1517`·`640:15617`). DS에 고를 수 있는 목록 줄·배너가 없어
 * 토큰만으로 단순하게: 고른 줄은 회색 바탕(와이어 PC), 경고는 경고 연한 바탕, 고른 티켓 줄은 위 구분선.
 */

export const list = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
});

export const row = style({
  display: 'flex',
  width: '100%',
  padding: vars.space[3],
  border: 'none',
  borderRadius: vars.radius[3],
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  selectors: {
    '&:hover:not(:disabled)': { background: vars.color.surface.container },
    '&[data-selected]': { background: vars.color.background.grey },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: -2 },
    '&:disabled': { cursor: 'default' },
  },
});

export const warning = style({
  padding: vars.space[3],
  borderRadius: vars.radius[3],
  background: vars.color.status.warningSubtle,
});

export const picked = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  paddingTop: vars.space[3],
  borderTop: `1px solid ${vars.color.surface.defaultBorder}`,
});

export const iconButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  padding: vars.space[1],
  border: 'none',
  borderRadius: vars.radius.full,
  background: 'transparent',
  color: vars.color.text.tertiary,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: vars.color.background.grey },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

/** 두둥 티켓 안내(legal-copy A-4) — 회색 글 3줄 */
export const notice = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
});
