import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/**
 * 네이티브 date/time 입력을 icon input 모양으로 감싼다(GUI `311:1633` 공연 일정 칸).
 * 브라우저 달력 아이콘은 숨기고 칸 어디를 눌러도 피커가 열리게 한다(`showPicker`).
 * 비어 있을 때 브라우저가 그리는 "연도. 월. 일." 대신 placeholder를 겹쳐 보인다.
 */
export const control = style({
  position: 'relative',
  cursor: 'pointer',
  selectors: {
    '&::-webkit-calendar-picker-indicator': { display: 'none' },
    '&[data-empty="true"]:not(:focus)::-webkit-datetime-edit': { color: 'transparent' },
    '&[data-empty="true"]:not(:focus)': { color: 'transparent' },
    '&:disabled': { cursor: 'not-allowed' },
  },
});

export const placeholder = style([
  typography.labelMd,
  {
    position: 'absolute',
    // 아이콘(20) + 간격(8) 뒤 — box의 왼쪽 여백 12에서 시작
    left: `calc(${vars.space[3]} + 20px + ${vars.space[2]})`,
    right: vars.space[3],
    pointerEvents: 'none',
    color: vars.color.text.tertiary,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    selectors: {
      '*:focus-within > &': { display: 'none' },
      '[data-disabled="true"] > &': { color: vars.color.interaction.disabledText },
    },
  },
]);
