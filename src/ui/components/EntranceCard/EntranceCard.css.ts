import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';

/**
 * 디자인 시스템 `입장 현황`(`652:1902` `type=데스크탑` — 모바일도 같은 변형). 배경 #F7F7F6 · 모서리 20 · 패딩 20 · 20 · 4.
 * 제목 `Heading/md2 - emphasized` → 숫자 `Heading/lg-emphasized` + 막대(높이 10, 바탕 Neutral 200 · 채움 `brand/primary`, 모서리 24)
 * 위아래 8 · 간격 8 → "QR 체크인 열기" `Label/lg-emphasized` `brand/primary` + `ic/forward` 16(위아래 16).
 */
export const card = style({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  padding: `${vars.space[5]} ${vars.space[5]} ${vars.space[1]}`,
  boxSizing: 'border-box',
  borderRadius: vars.radius[6],
  background: vars.color.surface.container,
});

export const figure = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  padding: `${vars.space[2]} 0`,
});

export const track = style({
  position: 'relative',
  height: 10,
  overflow: 'hidden',
  borderRadius: vars.radius[7],
  background: vars.color.surface.defaultBorder,
});

/** 채움 — Figma는 끝이 각진 막대(바탕만 둥글다). 바탕이 잘라 준다 */
export const fill = style({
  position: 'absolute',
  insetBlock: 0,
  left: 0,
  background: vars.color.brand.primary,
});

export const action = style({
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  padding: `${vars.space[4]} 0`,
  color: vars.color.brand.primary,
  textDecoration: 'none',
  borderRadius: vars.radius[2],
  selectors: {
    // hover는 Figma에 없다 — 밑줄
    '&:hover': { textDecoration: 'underline' },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

/** `ic/forward` 16 — 코드에는 24만 있어 줄여 그린다 */
export const actionIcon = style({ display: 'inline-flex', width: 16, height: 16 });
globalStyle(`${actionIcon} > svg`, { width: 16, height: 16 });
