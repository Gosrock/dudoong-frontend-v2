import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 주문 동의(② 호스트 제공 동의) — 디자인 없음(Q42). 섹션 좌우 24 · 위 20, 펼침은 DS Accordion */
export const agreement = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  paddingTop: vars.space[5],
});

/** ③ 고지 목록 — 글머리 자리 */
export const noticeList = style({ margin: 0, paddingInlineStart: vars.space[5] });
