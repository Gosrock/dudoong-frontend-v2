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

/** 호스트 행(gui `1175:21257` — 위아래 16 · 좌우 24, 아바타와 글자 사이 16) */
export const hostRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[4],
  padding: `${vars.space[4]} ${vars.space[5]}`,
});

/** 아바타 60 + 오른쪽 아래 ♥(gui: 아바타 기준 x 44 · y 36, 24) */
export const avatarBox = style({
  position: 'relative',
  flexShrink: 0,
  width: 60,
  height: 60,
});

/**
 * 관심 해제 ♥ — 그림은 24(gui `ic_favorite` filled, 채움 `brand/accent` #E84230)를 아바타 오른쪽 아래(왼쪽 44 · 위 36)에 두고,
 * 누르는 칸은 44로 넓힌다(그림 둘레 10씩 — 투명).
 */
export const heart = style({
  position: 'absolute',
  left: 44 - 10,
  top: 36 - 10,
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
