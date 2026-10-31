import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/**
 * Figma numbering(`426:887`): 20×20 원형, 아이콘 add/minus 12.
 * default 배경 `surface/default-label`, pressed 배경 `surface/strong-border`. disabled는 Figma에 없어 아이콘만 흐리게.
 */
export const numbering = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 20,
  height: 20,
  padding: 0,
  border: 'none',
  borderRadius: vars.radius.full,
  background: vars.color.surface.defaultLabel,
  color: vars.color.text.primary,
  cursor: 'pointer',
  selectors: {
    '&:active:not(:disabled)': { background: vars.color.surface.strongBorder },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
    '&:disabled': {
      cursor: 'not-allowed',
      background: vars.color.interaction.disabledBg,
      color: vars.color.interaction.disabledText,
    },
  },
});

/** GUI 수량 줄(`324:4503`): − 1 + 간격 8, 숫자 16 Bold `text/primary-label` */
export const stepper = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[2],
});

export const count = style([
  typography.headingSmEmphasized,
  {
    minWidth: 21,
    textAlign: 'center',
    color: vars.color.text.primaryLabel,
    fontVariantNumeric: 'tabular-nums',
  },
]);

export const countDisabled = style({ color: vars.color.interaction.disabledText });
