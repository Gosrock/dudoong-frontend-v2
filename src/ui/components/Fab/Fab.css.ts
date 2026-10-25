import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';

/**
 * Figma Button `Color=Primary, type=round`(`274:1244`) — 56 원형, 배경 `text/primary`(검정), 아이콘 24.
 * 2026-10-25: Hover #232220(`650:1260`)·Pressed #0A0A09(`650:1262`)·Disabled `interaction/disabled-bg`(`650:1264`).
 * 흰 판 `Color=Secondary`(`651:321`)는 쓰는 화면이 생기면 변형으로 더한다(V).
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
  transition: 'background-color 120ms ease',
  selectors: {
    '&:hover:not(:disabled)': { background: vars.color.button.fabHoverBg },
    '&:active:not(:disabled)': { background: vars.color.button.fabPressedBg },
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
