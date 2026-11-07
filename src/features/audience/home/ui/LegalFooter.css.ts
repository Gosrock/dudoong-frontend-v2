import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

import { CONTENT_MAX } from '../HomeView.css';

export const footer = style({ width: '100%' });

/** 공연홈 본문과 같은 왼쪽 선 — 모바일 24, PC는 1200 본문의 왼쪽(HomeView `edge`와 같은 식) */
export const inner = style({
  boxSizing: 'border-box',
  paddingInline: `max(${vars.space[5]}, calc((100% - ${CONTENT_MAX}px) / 2))`,
});

export const link = style({ textDecoration: 'underline', color: 'inherit' });
