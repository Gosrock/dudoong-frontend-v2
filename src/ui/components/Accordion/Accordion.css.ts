import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/** Figma list `second-closed`·`second-open` 행을 트리거로 쓴다(InfoRow second와 같은 치수) */
export const trigger = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.space[4],
  width: '100%',
  minHeight: 48,
  padding: `${vars.space[3]} ${vars.space[5]}`,
  border: 'none',
  borderTop: `1px solid ${vars.color.surface.defaultBorder}`,
  borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
  background: vars.color.background.normal,
  color: vars.color.text.secondaryLabel,
  textAlign: 'left',
  cursor: 'pointer',
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: -2 },
    '&:disabled': { cursor: 'not-allowed', color: vars.color.interaction.disabledText },
  },
});

export const label = style([typography.labelMd, { minWidth: 0 }]);

export const end = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
  flexShrink: 0,
});

export const meta = style([typography.labelMd]);

export const chevron = style({
  display: 'inline-flex',
  transition: 'transform 150ms ease',
  selectors: {
    [`${trigger}[data-state="open"] &`]: { transform: 'rotate(180deg)' },
  },
});

export const content = style({ overflow: 'hidden' });
