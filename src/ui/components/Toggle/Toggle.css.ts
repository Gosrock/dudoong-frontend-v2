import { createVar, style, styleVariants } from '@vanilla-extract/css';

import { media } from '../../theme/breakpoints';
import { vars } from '../../theme/tokens.css';

const trackWidth = createVar();
const trackHeight = createVar();
const knobSize = createVar();
const knobInset = createVar();
const knobTravel = createVar();

/**
 * Figma Toggle(`77:8`) `Size` 축(2026-11-28 새로, Design Sync #390 · #391):
 * - `24`: 트랙 45×24, 손잡이 19.5 · 안쪽 2.25, 켜짐 손잡이 x 23.25 — Knob `77:4` 값 그대로(M-2 2026-11-08).
 * - `18`: 트랙 34×18, 손잡이 14 · 안쪽 2, 켜짐 손잡이 x 18 — `1033:143` · `1033:156`.
 */
const SIZES = {
  18: { width: '34px', height: '18px', knob: '14px', inset: '2px', travel: '16px' },
  24: { width: '45px', height: '24px', knob: '19.5px', inset: '2.25px', travel: '21px' },
} as const;

type ToggleSize = keyof typeof SIZES;

const sizeVars = (size: ToggleSize) => {
  const v = SIZES[size];
  return {
    [trackWidth]: v.width,
    [trackHeight]: v.height,
    [knobSize]: v.knob,
    [knobInset]: v.inset,
    [knobTravel]: v.travel,
  };
};

export const size = styleVariants({ 18: { vars: sizeVars(18) }, 24: { vars: sizeVars(24) } });

/** 데스크탑(≥ 1024)에서만 바꾸는 크기 — `size={{ mobile, desktop }}` */
export const sizeDesktop = styleVariants({
  18: { '@media': { [media.desktop]: { vars: sizeVars(18) } } },
  24: { '@media': { [media.desktop]: { vars: sizeVars(24) } } },
});

/**
 * 트랙: 원형, 꺼짐 `interaction/inactive` · 켜짐 `brand/primary`.
 * `disabled?=true`(2026-11-01 새로): 켜짐 `brand/Primary container`(Violet 100) · 꺼짐 `interaction/disabled`(Neutral 200), 손잡이 흰색 그대로.
 */
export const root = style({
  position: 'relative',
  flexShrink: 0,
  width: trackWidth,
  height: trackHeight,
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
  top: knobInset,
  left: knobInset,
  width: knobSize,
  height: knobSize,
  borderRadius: vars.radius.full,
  background: vars.color.background.normal,
  transition: 'transform 150ms ease',
  selectors: { '&[data-state="checked"]': { transform: `translateX(${knobTravel})` } },
});
