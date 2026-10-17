import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/**
 * Figma Filter Chip(`121:1420`) — 32h, 패딩 6·12, 모서리 8, 테두리 `surface/default-border`.
 * 선택은 숫자 Badge(오른쪽 위로 10 넘침)가 붙는 것뿐이고, 열림은 chevron이 위로 바뀌는 것뿐이다.
 */
export const root = style([
  typography.labelSm,
  {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    gap: vars.space[1],
    height: 32,
    padding: `0 ${vars.space[3]}`,
    border: `1px solid ${vars.color.surface.defaultBorder}`,
    borderRadius: vars.radius[2],
    background: vars.color.background.normal,
    color: vars.color.text.primaryLabel,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    selectors: {
      '&:hover:not(:disabled)': { background: vars.color.surface.container },
      '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
      '&:disabled': { cursor: 'not-allowed', color: vars.color.interaction.disabledText },
    },
  },
]);

export const chevron = style({
  display: 'inline-flex',
  transition: 'transform 120ms ease',
  selectors: {
    [`${root}[aria-expanded="true"] &`]: { transform: 'rotate(180deg)' },
  },
});

export const badge = style({ position: 'absolute', top: -10, right: -10 });

export const srOnly = style({
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
});
