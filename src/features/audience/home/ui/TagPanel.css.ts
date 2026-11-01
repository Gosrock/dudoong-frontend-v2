import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 패널 안(GUI `759:12049` 306 − 패딩 16×2 = 274, 묶음 간격 12) */
export const root = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  width: 'min(274px, 100%)',
});

/** 분류 하나(GUI `759:12050` — 머리 줄 + 칩, 간격 8) */
export const group = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  margin: 0,
  padding: 0,
  border: 0,
  minWidth: 0,
});

export const groupHead = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

// FIGMA-CUSTOM: 태그 글자 칸(gui 759:12054 "Frame 1707480345" 4열 격자) 커스텀 → 커스텀 TagPanel.css.ts. DS 후보(design-system §3)
export const tags = style({
  display: 'grid',
  // 칸은 4등분이되 태그 글자보다 좁아지지 않는다 — '어쿠스틱·포크'(68px)가 57px 칸에서 '·' 뒤로 두 줄이 됐다(스테이징 QA #106 §3).
  // 긴 태그가 있는 분류만 그 칸이 넓어지고 나머지 칸이 나눠 줄어든다(4열 · 간격 그대로)
  gridTemplateColumns: 'repeat(4, minmax(max-content, 1fr))',
  columnGap: vars.space[4],
  rowGap: vars.space[2],
});

/** 태그 하나 — 글자만(고른 것 primary, 아니면 tertiary). 누르는 영역은 글자 줄보다 넓게 */
export const tag = style({
  display: 'block',
  minWidth: 0,
  margin: `calc(${vars.space[1]} * -1) 0`,
  padding: `${vars.space[1]} 0`,
  border: 0,
  background: 'none',
  textAlign: 'left',
  wordBreak: 'keep-all',
  color: vars.color.text.tertiary,
  cursor: 'pointer',
  selectors: {
    '&[aria-pressed="true"]': { color: vars.color.text.primary },
    '&:hover': { color: vars.color.text.secondary },
    '&[aria-pressed="true"]:hover': { color: vars.color.text.primary },
    '&:focus-visible': {
      outline: `2px solid ${vars.color.brand.primary}`,
      outlineOffset: 2,
      borderRadius: vars.radius[1],
    },
  },
});

/** "초기화"(GUI `759:12053` 11 Regular tertiary, 밑줄) */
export const reset = style({
  padding: 0,
  border: 0,
  background: 'none',
  color: vars.color.text.tertiary,
  textDecoration: 'underline',
  textUnderlineOffset: 2,
  cursor: 'pointer',
  selectors: {
    '&:disabled': { cursor: 'default' },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});
