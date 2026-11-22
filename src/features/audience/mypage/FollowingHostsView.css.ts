import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 정렬 라벨 줄(gui `1175:20349` — 위아래 10 · 좌우 24, 아래 구분선). 10은 토큰이 없어 12 */
export const sortBar = style({
  display: 'flex',
  justifyContent: 'flex-end',
  padding: `${vars.space[3]} ${vars.space[5]}`,
  borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
});

/** 목록 위 여백 — 구분선 묶음(`Frame 1707480423` 8)의 아래 4 */
export const hostList = style({ paddingTop: vars.space[1] });

/** 정렬 버튼(DS SortButton — 라벨 + chevron-down 12, 간격 4) */
export const sortButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[1],
  padding: 0,
  border: 0,
  background: 'transparent',
  color: vars.color.text.primaryLabel,
  cursor: 'pointer',
  borderRadius: vars.radius[1],
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

/** 호스트 행(gui `1175:21257` — 위아래 16 · 좌우 24). ♥가 아바타 기준으로 겹치도록 기준 상자 */
export const hostRow = style({
  position: 'relative',
  padding: `${vars.space[4]} ${vars.space[5]}`,
});

/** 호스트 영역 링크 — 아바타 · 글자 · 배지(아바타와 글자 사이 16), 행 전체 */
export const hostLink = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[4],
  color: 'inherit',
  textDecoration: 'none',
  borderRadius: vars.radius[2],
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

/**
 * 관심 해제 ♥ — 그림은 24(gui `ic_favorite` filled, 채움 `brand/accent` #E84230)를 아바타 오른쪽 아래(왼쪽 44 · 위 36)에 두고,
 * 누르는 칸은 44로 넓힌다(그림 둘레 10씩 — 투명).
 */
export const heart = style({
  position: 'absolute',
  // 행 안쪽(좌 24 · 위 16) + 아바타 기준(44 · 36) − 누르는 칸 여백 10
  left: `calc(${vars.space[5]} + ${44 - 10}px)`,
  top: `calc(${vars.space[4]} + ${36 - 10}px)`,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 44,
  height: 44,
  padding: 0,
  border: 0,
  borderRadius: vars.radius.full,
  background: 'transparent',
  color: vars.color.brand.accent,
  cursor: 'pointer',
  selectors: {
    '&:disabled': { color: vars.color.interaction.disabled, cursor: 'default' },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: -8 },
  },
});

globalStyle(`${heart} svg path`, { fill: 'currentColor' });
