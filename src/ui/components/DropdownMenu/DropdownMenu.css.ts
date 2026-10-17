import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

export const content = style({
  minWidth: 140,
  padding: vars.space[1],
});

/**
 * Figma dropdown item `284:1777` — 모서리 4, Label/md(14·500). Figma 28h(안쪽 4)는 손가락으로 누르기 작아
 * 안쪽 8 · 12(최소 36h)로 키웠다. 선택·hover 배경은 dropdown item selected의 surface.container.
 */
export const item = style([
  typography.labelMd,
  {
    display: 'flex',
    alignItems: 'center',
    gap: vars.space[2],
    minHeight: 36,
    padding: `${vars.space[2]} ${vars.space[3]}`,
    borderRadius: vars.radius[1],
    color: vars.color.text.primary,
    cursor: 'pointer',
    outline: 'none',
    userSelect: 'none',
    selectors: {
      '&[data-highlighted]': { background: vars.color.surface.container },
      '&[data-disabled]': { color: vars.color.interaction.disabledText, cursor: 'not-allowed' },
      '&[data-danger="true"]:not([data-disabled])': { color: vars.color.text.dangerLabel },
    },
  },
]);
