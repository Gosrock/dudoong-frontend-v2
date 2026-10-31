import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/**
 * Figma Checkbox `Box`(`120:1249`): 원형 20, 꺼짐은 2px 테두리 `text/primary-label`, 켜짐은 채움 `text/primary-label`(검정)
 * + 체크 `text/on-brand`. disabled는 같은 자리에 `interaction/disabled`.
 */
export const root = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 20,
  height: 20,
  padding: 0,
  border: `2px solid ${vars.color.text.primaryLabel}`,
  borderRadius: vars.radius.full,
  background: 'transparent',
  color: vars.color.text.onBrand,
  cursor: 'pointer',
  selectors: {
    '&[data-state="checked"]': {
      borderColor: vars.color.text.primaryLabel,
      background: vars.color.text.primaryLabel,
    },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
    '&:disabled': { cursor: 'not-allowed', borderColor: vars.color.interaction.disabled },
    '&:disabled[data-state="checked"]': { background: vars.color.interaction.disabled },
  },
});

export const indicator = style({ display: 'inline-flex' });

export const label = style([
  typography.bodyLg,
  {
    display: 'inline-flex',
    alignItems: 'center',
    gap: vars.space[2],
    color: vars.color.text.primaryLabel,
    cursor: 'pointer',
    selectors: {
      '&[data-disabled="true"]': {
        color: vars.color.interaction.disabledText,
        cursor: 'not-allowed',
      },
    },
  },
]);
