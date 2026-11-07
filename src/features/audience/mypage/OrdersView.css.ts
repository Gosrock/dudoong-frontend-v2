import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/**
 * 목록 위 오른쪽 정렬 라벨 줄(GUI `1047:32384` — 위아래 10 · 좌우 24, 아래 구분선). 10은 토큰이 없어 12(`space[3]`)로.
 * 구분선 묶음(`Frame 1707480423` 8 = 위아래 4 + 선)은 줄의 아래 테두리 + 카드 위 여백 4로 옮긴다.
 */
export const toolbar = style({
  display: 'flex',
  justifyContent: 'flex-end',
  padding: `${vars.space[3]} ${vars.space[5]}`,
  borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
});

/** 주문 카드(GUI `Frame 1707480431` — 위 12 · 아래 16 · 좌우 24 · 간격 8, + 구분선 묶음의 위아래 4) */
export const cardLink = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  padding: `calc(${vars.space[3]} + ${vars.space[1]}) ${vars.space[5]} calc(${vars.space[4]} + ${vars.space[1]})`,
  color: 'inherit',
  textDecoration: 'none',
});
