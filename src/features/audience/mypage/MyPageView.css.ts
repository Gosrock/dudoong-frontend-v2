import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 마이페이지 메뉴 행(와이어 햄버거 `128:2875` 아이콘 + 글자) */
export const menuRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  width: '100%',
  padding: `${vars.space[3]} ${vars.space[5]}`,
  border: 0,
  background: 'none',
  color: vars.color.text.primaryLabel,
  textAlign: 'left',
  textDecoration: 'none',
  cursor: 'pointer',
  selectors: { '&:hover': { background: vars.color.surface.container } },
});

/** 프로필 아바타 + 편집 배지(와이어 `128:2875` 연필) */
export const avatarWrap = style({ position: 'relative', flexShrink: 0 });

/** 연필 배지 — 와이어 `128:2904` 24 원(+ 아바타와 떼는 흰 테두리 2 = 28). 셸 드로어 · PC 아바타 메뉴와 크기가 다른 이유는 A31(`ShellDrawer.css.ts`) */
export const editBadge = style({
  position: 'absolute',
  right: -2,
  bottom: -2,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: vars.radius.full,
  border: `2px solid ${vars.color.background.normal}`,
  background: vars.color.text.secondaryLabel,
  color: vars.color.text.inverse,
  cursor: 'pointer',
});

export const editIcon = style({ width: 16, height: 16 });
