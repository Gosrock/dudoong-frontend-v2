import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 자르기 칸 · 확대 막대 — 사이 24(GUI 시트 안 간격) */
export const root = style({ display: 'flex', flexDirection: 'column', gap: vars.space[5] });

/** 자르기 칸 — 정사각 · 채움 `text/primary`(#141413) · 모서리 12(GUI `1458:5145`). 사진은 가운데 기준으로 옮긴다 */
export const box = style({
  position: 'relative',
  width: '100%',
  aspectRatio: '1 / 1',
  overflow: 'hidden',
  borderRadius: vars.radius[4],
  background: vars.color.text.primary,
  touchAction: 'none',
  cursor: 'grab',
  userSelect: 'none',
  selectors: { '&:active': { cursor: 'grabbing' } },
});

export const photo = style({
  position: 'absolute',
  top: '50%',
  left: '50%',
  maxWidth: 'none',
  pointerEvents: 'none',
});

/**
 * 가이드 — 가운데, 흰 선 2(GUI `1458:5165` 원 · `1476:8505` 직사각). 가이드 밖은 어둡게: 큰 그림자로 칸 나머지를 덮는다
 * (GUI "원 밖 어둡게" `1458:5164` · "가이드 밖 어둡게" `1476:8503` — #0a0a09 투명도 85%)
 */
const guideBase = style({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  border: `2px solid ${vars.color.background.normal}`,
  boxShadow: '0 0 0 9999px rgb(10 10 9 / 0.85)',
  pointerEvents: 'none',
});

export const guideCircle = style([guideBase, { borderRadius: vars.radius.full }]);
export const guideRect = style([guideBase]);

/** [−] 막대 [+] — 사이 12(GUI 로컬 "확대 축소" `1452:40749`) */
export const zoom = style({ display: 'flex', alignItems: 'center', gap: vars.space[3] });

export const zoomButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 24,
  height: 24,
  padding: 0,
  border: 0,
  background: 'none',
  color: vars.color.text.primaryLabel,
  cursor: 'pointer',
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

export const zoomIcon = style({ width: 24, height: 24 });

/**
 * 막대 — 트랙 4 · 모서리 2 · `surface/default-border`, 채움 `brand/primary`, 손잡이 20 흰 원 + 보라 선 2(GUI `1452:40742`).
 * 채운 길이는 화면이 `--fill`(%)로 알려 준다
 */
export const slider = style({
  flex: 1,
  minWidth: 0,
  height: 24,
  margin: 0,
  background: 'transparent',
  appearance: 'none',
  cursor: 'pointer',
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

const track = {
  height: 4,
  borderRadius: 2,
  background: `linear-gradient(to right, ${vars.color.brand.primary} var(--fill, 0%), ${vars.color.surface.defaultBorder} var(--fill, 0%))`,
};
const thumb = {
  width: 20,
  height: 20,
  borderRadius: '50%',
  background: vars.color.background.normal,
  border: `2px solid ${vars.color.brand.primary}`,
  boxSizing: 'border-box' as const,
};
globalStyle(`${slider}::-webkit-slider-runnable-track`, track);
globalStyle(`${slider}::-moz-range-track`, track);
globalStyle(`${slider}::-webkit-slider-thumb`, { ...thumb, appearance: 'none', marginTop: -8 });
globalStyle(`${slider}::-moz-range-thumb`, thumb);

/** [다시 선택] [적용] — 반반, 사이 8(GUI `1458:5175`) */
export const buttons = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: vars.space[2],
  width: '100%',
});

/** 자르기 실패 안내 — 확대 막대 아래 */
export const error = style({ margin: 0, marginTop: vars.space[3] });
