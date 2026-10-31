import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

export const group = style({
  display: 'flex',
  gap: vars.space[2],
  width: '100%',
});

/**
 * GUI 로컬 `Check Button`(`567:7982`): 40h, 모서리 10, 여백 10·16, 14 Medium.
 * Default는 테두리 `surface/default-border` + 글자 `text/primary`, selected는 테두리 `brand/primary` + 글자 `text/brand-label`.
 * disabled는 Figma에 없어 Button disabled와 같은 색.
 */
export const item = style([
  typography.labelMd,
  {
    flex: '1 1 0',
    minWidth: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    padding: `0 ${vars.space[4]}`,
    border: `1px solid ${vars.color.surface.defaultBorder}`,
    borderRadius: vars.radius[3],
    background: vars.color.background.normal,
    color: vars.color.text.primary,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'border-color 120ms ease, color 120ms ease',
    selectors: {
      '&:hover:not(:disabled)': { background: vars.color.surface.container },
      '&[data-state="checked"]': {
        borderColor: vars.color.brand.primary,
        color: vars.color.text.brandLabel,
      },
      '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
      '&:disabled': {
        cursor: 'not-allowed',
        background: vars.color.interaction.disabledBg,
        borderColor: vars.color.interaction.disabled,
        color: vars.color.interaction.disabledText,
      },
    },
  },
]);
