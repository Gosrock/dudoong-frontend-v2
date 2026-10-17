import { createVar, style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/**
 * GUI 태그 버튼(`329:7170`·`311:1633` 태그 칸): 40h, 모서리 4, 여백 10·16, 14 Medium, 테두리 `surface/default-border`.
 * 선택은 배경 `Background/dark` + 글자 `text/inverse`(검정 채움). 디자인 시스템 컴포넌트는 아니다.
 */
export const chip = style([
  typography.labelMd,
  {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    height: 40,
    padding: `0 ${vars.space[4]}`,
    border: `1px solid ${vars.color.surface.defaultBorder}`,
    borderRadius: vars.radius[1],
    background: vars.color.background.normal,
    color: vars.color.text.primary,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background-color 120ms ease, color 120ms ease',
    selectors: {
      '&:hover:not(:disabled):not([aria-disabled="true"]):not([aria-pressed="true"])': {
        background: vars.color.surface.container,
      },
      '&[aria-pressed="true"]': {
        background: vars.color.background.dark,
        borderColor: vars.color.background.dark,
        color: vars.color.text.inverse,
      },
      '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
      '&:disabled, &[aria-disabled="true"]': {
        cursor: 'not-allowed',
        color: vars.color.interaction.disabledText,
      },
      '&:disabled': { background: vars.color.interaction.disabledBg },
    },
  },
]);

export const columns = createVar();

/** GUI는 4열 고정 폭 78, 간격 10 → 열 수만 받고 칸을 똑같이 나눈다(간격은 토큰 8) */
export const grid = style({
  display: 'grid',
  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
  gap: vars.space[2],
  width: '100%',
});

export const wrap = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.space[2],
});
