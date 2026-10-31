import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 호스트 홈 공연 카드(와이어 `503:30867` — 회색 포스터 상자 + 칩 + 제목 + 날짜). 와이어 수준(design-workflow §3):
 * 포스터 비율 148:210(와이어 카드 크기), 모서리 `radius[2]`, 폭 모바일 148 · PC 200(🤖 — 가로 줄에 4~5장이 보이게).
 */
export const item = style({
  flexShrink: 0,
  width: 148,
  scrollSnapAlign: 'start',
  '@media': { [media.desktop]: { width: 200 } },
});

export const card = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  color: 'inherit',
  textDecoration: 'none',
  borderRadius: vars.radius[2],
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

export const posterWrap = style({
  position: 'relative',
  display: 'block',
  width: '100%',
  aspectRatio: '148 / 210',
  marginBottom: vars.space[1],
  borderRadius: vars.radius[2],
  overflow: 'hidden',
  background: vars.color.surface.imageBg,
});

export const poster = style({
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const chip = style({
  position: 'absolute',
  top: vars.space[2],
  left: vars.space[2],
});
