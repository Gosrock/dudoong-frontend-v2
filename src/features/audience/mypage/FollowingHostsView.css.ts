import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 관심 해제 하트(P5c 호스트 홈 ♡와 같은 모양 — 눌린 상태 = 채운 하트, 브랜드 색) */
export const heart = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 44,
  height: 44,
  padding: 0,
  border: 0,
  borderRadius: vars.radius.full,
  background: 'transparent',
  color: vars.color.text.primaryLabel,
  cursor: 'pointer',
  selectors: {
    '&[aria-pressed="true"]': { color: vars.color.brand.primary },
    '&:disabled': { color: vars.color.interaction.disabled, cursor: 'default' },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

globalStyle(`${heart}[aria-pressed="true"] svg path`, { fill: 'currentColor' });

export const hostRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  padding: `${vars.space[3]} ${vars.space[5]}`,
});

export const filterBar = style({
  display: 'flex',
  justifyContent: 'flex-end',
  padding: `${vars.space[3]} ${vars.space[5]}`,
  borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
});

export const filterDropdown = style({ width: 160 });
