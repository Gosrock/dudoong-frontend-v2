import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/** 대시보드 본문 좌우와 같게 — 모바일 36(H1 M-4 2026-11-08) · PC 24 */
const MOBILE_SIDE = '36px';

/** 머리 아래 "취소된 공연" 안내 — 좌우는 대시보드 본문과 같다, 디자인 없음(Q122) */
export const canceledBox = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  padding: `${vars.space[4]} ${MOBILE_SIDE} 0`,
  '@media': { [media.desktop]: { padding: `${vars.space[4]} ${vars.space[5]} 0` } },
});

export const noticeText = style({ display: 'block' });

/** 맨 아래 [공연 취소] — 유의사항과 같은 좌우 여백, 디자인 없음(Q123) */
export const section = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  padding: `${vars.space[6]} ${MOBILE_SIDE}`,
  '@media': { [media.desktop]: { padding: `${vars.space[6]} ${vars.space[5]}` } },
});
