import { style, styleVariants } from '@vanilla-extract/css';

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

const headerBase = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
});

/**
 * 머리 줄. `default` — Header(Top app bar)와 같은 높이·패딩(64, 아이콘 쪽 8).
 * `menu` — GUI 햄버거(Top app bar 패딩 16 → 아이콘이 가장자리에서 24). 높이 56은 GUI에서 본문(프로필 줄)이 Top app bar 아래 끝보다
 * 9px 위에서 시작해(`1047:31932` y102 · 바 아래 끝 111) 아바타가 머리 줄 위에서 67에 오게 맞춘 값
 */
export const header = styleVariants({
  default: [headerBase, { minHeight: 64, padding: `${vars.space[2]} ${vars.space[2]}` }],
  menu: [headerBase, { minHeight: 56, padding: `${vars.space[2]} ${vars.space[4]}` }],
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

const bodyBase = style({
  flex: '1 1 auto',
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
});

/** 본문. `menu` — GUI 햄버거 본문 프레임 좌우 24 · 위 0(`1047:31932`), 아래는 마지막 줄이 화면 끝에 붙지 않게 32 */
export const body = styleVariants({
  default: [bodyBase, { padding: `${vars.space[2]} ${vars.space[5]} ${vars.space[6]}` }],
  menu: [bodyBase, { padding: `0 ${vars.space[5]} ${vars.space[6]}` }],
});
