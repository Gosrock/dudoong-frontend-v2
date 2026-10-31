import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';

const reduced = '(prefers-reduced-motion: reduce)';

/** 딤 — BottomSheet·Modal과 같은 값. 전체 화면이라 거의 보이지 않지만 밀어 닫을 때 드러난다 */
export const overlay = style({
  position: 'fixed',
  inset: 0,
  zIndex: vars.zIndex.sheet,
  background: vars.color.overlay.dim,
  '@media': { [reduced]: { animation: 'none !important' } },
});

export const content = style({
  position: 'fixed',
  top: 0,
  bottom: 0,
  left: 0,
  zIndex: vars.zIndex.sheet,
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  height: '100dvh',
  background: vars.color.background.normal,
  color: vars.color.text.primary,
  outline: 'none',
  '@media': { [reduced]: { animation: 'none !important', transition: 'none !important' } },
});

/** 머리 줄 — Header(Top app bar)와 같은 높이·패딩(64, 아이콘 쪽 8) */
export const header = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
  minHeight: 64,
  padding: `${vars.space[2]} ${vars.space[2]}`,
});

export const trailing = style({ display: 'flex', alignItems: 'center', gap: vars.space[2] });

/** 24 아이콘, 누르는 영역 40(Header 슬롯과 같다) */
export const iconButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  padding: 0,
  border: 0,
  borderRadius: vars.radius.full,
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: -2 },
  },
});

export const body = style({
  flex: '1 1 auto',
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  padding: `${vars.space[2]} ${vars.space[5]} ${vars.space[6]}`,
});
