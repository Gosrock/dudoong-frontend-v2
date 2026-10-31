import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 유의사항 확인 상자 — GUI `908:12227`(342×124 · 모서리 12 · 패딩 12 · 채움 #F7F7F6 변수) */
export const notice = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  padding: vars.space[3],
  borderRadius: vars.radius[4],
  background: vars.color.surface.container,
});

/** 안내 두 줄 — 체크 상자(20) + 간격 8 만큼 들여 쓴다(GUI 왼쪽 패딩 29 → 28) */
export const noticeList = style({
  margin: 0,
  paddingLeft: 28,
  listStyle: 'none',
});

/** 공유 버튼 3개 — 같은 폭 · 간격 8(GUI `908:13336` 109×46 ×3) */
export const shareRow = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: vars.space[2],
});

/** 공유 버튼 아이콘 — GUI 18(DS Button medium 아이콘 칸). 아이콘 원본은 24라 표시 크기만 줄인다 */
export const shareIcon = style({ width: 18, height: 18, flexShrink: 0 });
