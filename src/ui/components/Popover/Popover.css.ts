import { keyframes, style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';

const fadeIn = keyframes({ from: { opacity: 0, transform: 'scale(0.98)' } });

/**
 * 떠 있는 면 — 디자인이 없어 Toast(`303:2665`) 모양을 따른다: 흰 배경, 1px 테두리(surface.strongBorder),
 * 모서리 12, 그림자 drop. Popover·DropdownMenu가 같이 쓴다.
 */
export const surface = style({
  zIndex: vars.zIndex.popover,
  background: vars.color.background.normal,
  color: vars.color.text.primary,
  border: `1px solid ${vars.color.surface.strongBorder}`,
  borderRadius: vars.radius[4],
  boxShadow: vars.shadow.drop,
  outline: 'none',
  transformOrigin: 'var(--radix-popper-transform-origin)',
  selectors: { '&[data-state="open"]': { animation: `${fadeIn} 120ms ease-out` } },
  '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none !important' } },
});

export const content = style({
  maxWidth: `min(320px, calc(100vw - ${vars.space[4]} * 2))`,
  padding: vars.space[4],
});

export const arrow = style({ fill: vars.color.background.normal });
