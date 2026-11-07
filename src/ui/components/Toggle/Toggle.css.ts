import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';

/**
 * Figma Toggle(`77:8`): 트랙 45×24 원형, 꺼짐 `interaction/inactive` · 켜짐 `brand/primary`, 손잡이 19.5 · 안쪽 2.25 흰색(Common/100) — Knob `77:4` 값 그대로(M-2 2026-11-08).
 * `disabled?=true`(2026-11-01 새로): 켜짐 `brand/Primary container`(Violet 100) · 꺼짐 `interaction/disabled`(Neutral 200), 손잡이 흰색 그대로.
 */
export const root = style({
  position: 'relative',
  flexShrink: 0,
  width: 45,
  height: 24,
  padding: 0,
  border: 'none',
  borderRadius: vars.radius.full,
  background: vars.color.interaction.inactive,
  cursor: 'pointer',
  transition: 'background-color 150ms ease',
  selectors: {
    '&[data-state="checked"]': { background: vars.color.brand.primary },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
    '&:disabled': { cursor: 'not-allowed', background: vars.color.interaction.disabled },
    '&:disabled[data-state="checked"]': { background: vars.color.brand.primaryContainer },
  },
});

/** 손잡이는 Figma가 원시 색 Common/100을 쓴다(design-system §1 표) — 라이트의 `Background/normal`과 같은 흰색 */
export const thumb = style({
  position: 'absolute',
  top: 2.25,
  left: 2.25,
  width: 19.5,
  height: 19.5,
  borderRadius: vars.radius.full,
  background: vars.color.background.normal,
  transition: 'transform 150ms ease',
  selectors: { '&[data-state="checked"]': { transform: 'translateX(21px)' } },
});
