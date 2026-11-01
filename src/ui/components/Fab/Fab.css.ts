import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';

/**
 * Figma Button `Color=Primary, type=round`(`274:1244`) — 56 원형, 배경 `text/primary`(검정), 아이콘 24.
 * 2026-10-25: Hover #232220(`650:1260`)·Pressed #0A0A09(`650:1262`)·Disabled `interaction/disabled-bg`(`650:1264`).
 * 흰 판 `Color=Secondary`(`651:321`)는 쓰는 화면이 생기면 변형으로 더한다(V).
 */
export const fab = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 56,
  height: 56,
  padding: 0,
  border: 'none',
  borderRadius: vars.radius.full,
  background: vars.color.text.primary,
  color: vars.color.text.inverse,
  cursor: 'pointer',
  transition: 'background-color 120ms ease',
  selectors: {
    '&:hover:not(:disabled)': { background: vars.color.surface.inverseHover },
    '&:active:not(:disabled)': { background: vars.color.surface.inversePressed },
    '&:focus-visible': {
      outline: `2px solid ${vars.color.brand.primary}`,
      outlineOffset: 2,
    },
    '&:disabled': {
      cursor: 'not-allowed',
      background: vars.color.interaction.disabledBg,
      color: vars.color.interaction.disabledText,
    },
  },
});

/**
 * 화면 오른쪽 아래에 떠 있는 버튼(FAB · [+ 새 … 만들기])의 자리 — 아래 24 + 기기 안전 영역.
 * 떠 있는 버튼을 쓰는 화면은 본문 아래 여백을 `fabClearance`로 둔다 — 스크롤 끝에서 마지막 카드·문구를 가리지 않게
 * (스테이징 QA #92-8: 여백 80이 안전 영역(iPhone 34)을 빼고 계산돼 마지막 줄을 가렸다).
 */
export const fabBottom = `calc(${vars.space[5]} + env(safe-area-inset-bottom))`;

/** 본문 아래 여백 = 버튼 아래 24 + 버튼 높이 + 틈 16 + 안전 영역. 버튼 높이별(DS Button md 46 · Fab/Button lg 56) */
export const fabClearance = {
  md: `calc(${vars.space[5]} + 46px + ${vars.space[4]} + env(safe-area-inset-bottom))`,
  lg: `calc(${vars.space[5]} + 56px + ${vars.space[4]} + env(safe-area-inset-bottom))`,
} as const;
