import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 선물 받기 화면 — GUI `939:26721`(390). 포스터 294 + 공연 정보 + 버튼 줄 342. PC는 같은 묶음을 가운데로(디자인 없음) */
export const page = style({
  flex: '1 0 auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
  // 위 56(GUI 헤더 아래 40 + 묶음 패딩 16 → 48 + 8)
  padding: `${vars.space[8]} ${vars.space[5]} ${vars.space[9]}`,
  paddingTop: `calc(${vars.space[8]} + ${vars.space[2]})`,
});

export const content = style({
  width: '100%',
  maxWidth: 342,
});

/** 포스터 — `939:26845` "image 182-1" 294×416 · 모서리 16 · 그림자(티켓탭 카드와 같다). 없거나 깨지면 빈 상자(Q26 기본안) */
export const poster = style({
  position: 'relative',
  width: 'min(294px, 75vw)',
  aspectRatio: '294 / 416',
  borderRadius: vars.radius[5],
  overflow: 'hidden',
  background: vars.color.surface.imageBg,
  boxShadow: vars.shadow.drop,
});

export const posterImage = style({
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

/** 버튼 두 개 같은 폭, 간격 12(GUI 166 · 164) */
export const actions = style({
  display: 'grid',
  gridAutoFlow: 'column',
  gridAutoColumns: '1fr',
  gap: vars.space[3],
  width: '100%',
});

/** 결과 틀(`GiftResult`)을 감싸는 main — 셸 본문 높이를 채워 묶음이 세로 가운데쯤 오게 */
export const fill = style({
  flex: '1 0 auto',
  display: 'flex',
  flexDirection: 'column',
});
