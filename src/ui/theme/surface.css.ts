import { keyframes, style } from '@vanilla-extract/css';

import { vars } from './tokens.css';

const fadeIn = keyframes({ from: { opacity: 0, transform: 'scale(0.98)' } });

/**
 * 떠 있는 면(Radix Popper 내용) — GUI 태그 패널 상자(`759:12049` · 새 판 `1231:2003`)대로: 흰 배경, 1px 테두리 `surface/default-border`,
 * 모서리 8, 그림자 drop(이펙트 스타일 `drop shadow` — Figma와 같음). `Popover`가 쓴다.
 * 2026-11-08 O21 — Ready 밖이어도 Figma대로(사용자 결정 11-08). 옛 값은 Toast 면(테두리 strongBorder · 모서리 12) — 컴포넌트끼리 서로의 `.css.ts`를 import하지 않게 theme에 둔다
 * (patterns §7, 코드 패턴 점검 A44).
 */
export const floatingSurface = style({
  zIndex: vars.zIndex.popover,
  background: vars.color.background.normal,
  color: vars.color.text.primary,
  border: `1px solid ${vars.color.surface.defaultBorder}`,
  borderRadius: vars.radius[2],
  boxShadow: vars.shadow.drop,
  outline: 'none',
  transformOrigin: 'var(--radix-popper-transform-origin)',
  selectors: { '&[data-state="open"]': { animation: `${fadeIn} 120ms ease-out` } },
  '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none !important' } },
});

/**
 * 열린 목록 면 = DS `dropdown`(`┗ Dropdown` 페이지 — GUI 티켓 ⋮ 메뉴 `958:20518` · 예매자 검색 기준 `1029:6014`):
 * 흰 배경, 1px 테두리 `surface/default-border`, 모서리 8, **그림자 없음**, 안쪽 위아래 12 · 좌우 8, 항목 사이 4.
 * `DropdownMenu`(⋮ 메뉴) · `Dropdown`(열린 목록)이 같이 쓴다(2026-11-08 `fm-ds-overlays` O19 · O20 — 옛 Toast 면에서 바꿈).
 */
export const dropdownSurface = style({
  zIndex: vars.zIndex.popover,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  padding: `${vars.space[3]} ${vars.space[2]}`,
  background: vars.color.background.normal,
  color: vars.color.text.primary,
  border: `1px solid ${vars.color.surface.defaultBorder}`,
  borderRadius: vars.radius[2],
  outline: 'none',
  transformOrigin: 'var(--radix-popper-transform-origin)',
  selectors: { '&[data-state="open"]': { animation: `${fadeIn} 120ms ease-out` } },
  '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none !important' } },
});
