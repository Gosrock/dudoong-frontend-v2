import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 머리 아래 "취소된 공연" 안내 — 좌우는 대시보드 본문과 같은 24(PC 20), 디자인 없음(Q122) */
export const canceledBox = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  padding: `${vars.space[4]} ${vars.space[5]} 0`,
});

export const noticeText = style({ display: 'block' });

/** 맨 아래 [공연 취소] — 유의사항과 같은 좌우 여백, 디자인 없음(Q123) */
export const section = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  padding: `${vars.space[6]} ${vars.space[5]}`,
});
