import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/** GUI `958:20518` "dropdown open" 116폭(항목 100 + 좌우 8) — 면은 `theme/surface.css` `dropdownSurface` */
export const content = style({ minWidth: 116 });

/**
 * Figma dropdown item `284:1777`(GUI `958:20518` 안) — 28h · 안쪽 4 · 모서리 4 · Label/md(14·500).
 * 28h는 WCAG 2.5.8(24 이상)을 넘는다(2026-11-08 O19 — 옛 36h에서 Figma대로). hover · 키보드 이동 배경은 dropdown item selected의 surface.container.
 */
export const item = style([
  typography.labelMd,
  {
    display: 'flex',
    alignItems: 'center',
    gap: vars.space[2],
    minHeight: 28,
    padding: vars.space[1],
    borderRadius: vars.radius[1],
    color: vars.color.text.primary,
    cursor: 'pointer',
    outline: 'none',
    userSelect: 'none',
    selectors: {
      '&[data-highlighted]': { background: vars.color.surface.container },
      '&[data-disabled]': { color: vars.color.interaction.disabledText, cursor: 'not-allowed' },
      '&[data-danger="true"]:not([data-disabled])': { color: vars.color.text.dangerLabel },
    },
  },
]);

/**
 * `variant="card"` — GUI 상세정보 탭 메뉴(`1318:385`, #191): 흰 판 200 · 테두리 `surface/default-border` · 모서리 12 ·
 * 그림자 `drop shadow` · 안쪽 6 · 항목 사이 2. FIGMA-CUSTOM: 화면이 직접 그린 메뉴(DS `dropdown`과 다름 — 2단계 후보)
 */
export const cardContent = style({
  zIndex: vars.zIndex.popover,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minWidth: 200,
  padding: 6,
  background: vars.color.background.normal,
  color: vars.color.text.primary,
  border: `1px solid ${vars.color.surface.defaultBorder}`,
  borderRadius: vars.radius[4],
  boxShadow: vars.shadow.drop,
  outline: 'none',
});

/** 항목 37h — 위아래 9 · 좌우 10 · 아이콘 18 ↔ 글자 12 · `Label/lg`. 누름 · 키보드 이동 배경은 `surface.container`(Figma 첫 항목 모양) */
export const cardItem = style([
  typography.labelLg,
  {
    display: 'flex',
    alignItems: 'center',
    gap: vars.space[3],
    padding: '9px 10px',
    borderRadius: vars.radius[1],
    color: vars.color.text.primary,
    cursor: 'pointer',
    outline: 'none',
    userSelect: 'none',
    selectors: {
      '&[data-highlighted]': { background: vars.color.surface.container },
      '&[data-disabled]': { color: vars.color.interaction.disabledText, cursor: 'not-allowed' },
      '&[data-danger="true"]:not([data-disabled])': { color: vars.color.text.dangerLabel },
    },
  },
]);

/** 항목 사이 선 1 — `surface/default-border` */
export const cardSeparator = style({
  height: 1,
  background: vars.color.surface.defaultBorder,
});
