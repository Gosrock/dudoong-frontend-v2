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
 * 열린 목록. Figma에는 컴포넌트가 없고 예시 프레임(`284:1755`, `318:5749`)뿐이라 테두리·그림자는 Toast 규칙을 빌렸다.
 * 시트·모달 안에서도 위에 떠야 해서 modal보다 한 단계 위.
 */
export const content = style({
  zIndex: vars.zIndex.popover,
  minWidth: 'var(--radix-select-trigger-width)',
  maxHeight: 'var(--radix-select-content-available-height)',
  overflow: 'hidden',
  padding: vars.space[1],
  border: `1px solid ${vars.color.surface.defaultBorder}`,
  borderRadius: vars.radius[2],
  background: vars.color.background.normal,
  boxShadow: vars.shadow.drop,
});

/**
 * Figma dropdown item(`284:1777`): 28h, 여백 4, 선택은 배경 `surface/container` + 모서리 4 + check 12.
 * hover(키보드 이동 포함)와 disabled는 Figma에 없는 상태다(design-system §3).
 */
export const item = style([
  typography.labelMd,
  {
    display: 'flex',
    alignItems: 'center',
    gap: vars.space[1],
    minHeight: 28,
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

export const itemIndicator = style({ display: 'inline-flex' });
