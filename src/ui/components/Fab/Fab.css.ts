import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';

/**
 * Figma Button `type=round`(`274:1244`) — 56 원형, 배경 `text/primary`(검정), 아이콘 24.
 * Figma에는 Normal 하나뿐이다. Pressed·Disabled·포커스는 Button과 같은 규칙으로 채웠다.
 */
export const fab = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 56,
  height: 56,
  padding: 0,
  border: 'none',
  borderRadius: vars.radius.full,
  background: vars.color.text.primary,
  color: vars.color.text.inverse,
  cursor: 'pointer',
  transition: 'opacity 120ms ease',
  selectors: {
    '&:hover:not(:disabled)': { opacity: 0.9 },
    '&:active:not(:disabled)': { opacity: 0.8 },
    '&:focus-visible': {
      outline: `2px solid ${vars.color.brand.primary}`,
      outlineOffset: 2,
    },
    '&:disabled': {
      cursor: 'not-allowed',
      background: vars.color.interaction.disabledBg,
      color: vars.color.interaction.disabledText,
    },
  },
});
