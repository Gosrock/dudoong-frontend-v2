import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

import { CONTENT_MAX } from '../HomeView.css';

/** 회색 판(GUI `1383:3429` — 채움 `Background/grey`, 폭 전체) */
export const footer = style({ width: '100%', background: vars.color.background.grey });

/** 안쪽 24(GUI 위아래 · 좌우 24). 좌우는 공연홈 본문과 같은 선 — 모바일 24, PC는 1200 본문의 왼쪽(HomeView `edge`와 같은 식) */
export const inner = style({
  boxSizing: 'border-box',
  paddingBlock: vars.space[5],
  paddingInline: `max(${vars.space[5]}, calc((100% - ${CONTENT_MAX}px) / 2))`,
});

/** 처리방침 · 이용약관(GUI `1383:3439` — 글자만 밑줄, 구분선 `|`은 밑줄 없음) */
export const link = style({
  color: 'inherit',
  textDecoration: 'underline',
  borderRadius: vars.radius[1],
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

/** 링크 사이 "  |  "(GUI는 줄바꿈 없는 공백 둘씩) */
export const separator = style({ paddingInline: '0.5em' });

export const snsList = style({ listStyle: 'none', margin: 0, padding: 0 });

/** SNS 아이콘 24(GUI `1383:3434`, 색 `text/secondary`) — 누르는 칸은 아이콘 크기 그대로 */
export const snsLink = style({
  display: 'flex',
  color: vars.color.text.secondary,
  borderRadius: vars.radius[1],
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});
