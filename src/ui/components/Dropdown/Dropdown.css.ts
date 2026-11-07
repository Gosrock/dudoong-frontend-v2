import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/**
 * Figma Dropdown(`284:1737`): 44h, 모서리 8, 여백 위아래 12 · 왼쪽 12 · 오른쪽 8, 간격 4, 아이콘 `up-down` 24.
 * 테두리 상자는 Input과 같은 `box`를 쓰고, 여기서는 트리거 차이만 덧붙인다.
 */
export const trigger = style([
  typography.labelMd,
  {
    justifyContent: 'space-between',
    gap: vars.space[1],
    paddingRight: vars.space[2],
    height: 44,
    textAlign: 'left',
    cursor: 'pointer',
    outline: 'none',
    selectors: {
      '&:focus-visible, &[data-state="open"]': { borderColor: vars.color.brand.primary },
      '&:disabled': {
        cursor: 'not-allowed',
        background: vars.color.interaction.disabledBg,
        borderColor: vars.color.interaction.disabled,
        color: vars.color.interaction.disabledText,
      },
    },
  },
]);

export const value = style({
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  selectors: {
    // Radix가 placeholder를 보일 때 트리거에 data-placeholder를 단다
    [`[data-placeholder] > &`]: { color: vars.color.text.tertiary },
    [`[data-placeholder]:disabled > &`]: { color: vars.color.interaction.disabledText },
  },
});

export const icon = style({ display: 'inline-flex', flexShrink: 0 });

/**
 * 열린 목록. 면은 `theme/surface.css` `dropdownSurface`(DS `dropdown` — 안쪽 12/8 · 항목 사이 4 · 그림자 없음, GUI `1029:6014` ·
 * `1030:8703`, 2026-11-08 O20). 시트·모달 안에서도 위에 떠야 해서 modal보다 한 단계 위(popover).
 */
export const content = style({
  minWidth: 'var(--radix-select-trigger-width)',
  maxHeight: 'var(--radix-select-content-available-height)',
  overflow: 'hidden',
});

/** 항목 사이 4(Radix Viewport가 항목을 감싼다) */
export const viewport = style({ display: 'flex', flexDirection: 'column', gap: vars.space[1] });

/**
 * Figma dropdown item(`284:1777`): 36h(2026-10-31, 옛 28), 여백 4, 선택은 배경 `surface/container` + 모서리 4 + check 12.
 * 고른 항목은 글자 · ✓를 양 끝으로(`selected=true` 정렬 SPACE_BETWEEN — GUI `1029:6014` · `1007:4083`도 ✓가 오른쪽 끝, I-h3).
 * hover(키보드 이동 포함)와 disabled는 Figma에 없는 상태다(design-system §3).
 */
export const item = style([
  typography.labelMd,
  {
    display: 'flex',
    alignItems: 'center',
    gap: vars.space[1],
    minHeight: 36,
    padding: vars.space[1],
    borderRadius: vars.radius[1],
    color: vars.color.text.primary,
    cursor: 'pointer',
    outline: 'none',
    userSelect: 'none',
    selectors: {
      '&[data-state="checked"]': { background: vars.color.surface.container },
      '&[data-highlighted]': { background: vars.color.background.grey },
      '&[data-disabled]': {
        color: vars.color.interaction.disabledText,
        cursor: 'not-allowed',
        background: 'transparent',
      },
    },
  },
]);

/** ✓를 항목 오른쪽 끝으로(DS `selected=true` SPACE_BETWEEN) */
export const itemIndicator = style({ display: 'inline-flex', flexShrink: 0, marginLeft: 'auto' });
