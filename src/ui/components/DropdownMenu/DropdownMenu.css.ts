import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/** GUI `958:20518` "dropdown open" 116폭(항목 100 + 좌우 8) — 면은 `theme/surface.css` `dropdownSurface` */
export const content = style({ minWidth: 116 });

/**
 * Figma dropdown item `284:1777`(GUI `958:20518` 안) — 28h · 안쪽 4 · 모서리 4 · Label/md(14·500).
 * 28h는 WCAG 2.5.8(24 이상)을 넘는다(2026-11-08 O19 — 옛 36h에서 Figma대로). hover · 키보드 이동 배경은 dropdown item selected의 surface.container.
 */
export const item = style([
  typography.labelMd,
  {
    display: 'flex',
    alignItems: 'center',
    gap: vars.space[2],
    minHeight: 28,
    padding: vars.space[1],
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
