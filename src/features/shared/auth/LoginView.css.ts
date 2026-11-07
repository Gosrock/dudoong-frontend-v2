import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/**
 * 로그인·세션 만료(GUI `1175:16950`, 390×844) — 셸 본문 높이를 채우고 묶음(일러스트 · 안내 · 버튼)을 세운다.
 * GUI는 묶음이 가운데보다 위다(헤더 아래 150 · 묶음 284 · 아래 299 ≈ 1:2) — 남는 높이를 위 1 : 아래 2로 나눠 같은 비율을 지킨다.
 */
export const main = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: `${vars.space[5]} ${vars.space[5]}`,
  selectors: {
    '&::before': { content: '""', flex: 1 },
    '&::after': { content: '""', flex: 2 },
  },
});

/** 묶음(`1175:16953` — 세로, 간격 24, 가운데 정렬) */
export const content = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.space[5],
  width: '100%',
});

/** 버튼 자리(`1175:16958` — 폭 254) */
export const action = style({
  display: 'flex',
  justifyContent: 'center',
  width: '100%',
  maxWidth: 254,
});
