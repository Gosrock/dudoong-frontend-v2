import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { sprinkles } from '@/ui/theme/sprinkles.css';
import { vars } from '@/ui/theme/tokens.css';

/** 아카이빙 포스터 그리드(와이어 `503:16328` 2열, PC `671:6692` 4열) */
export const grid = style([
  sprinkles({ listStyle: 'none' }),
  {
    margin: 0,
    padding: `${vars.space[4]} ${vars.space[5]}`,
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: `${vars.space[5]} ${vars.space[4]}`,
    '@media': { [media.desktop]: { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' } },
  },
]);

export const gridPoster = style({
  position: 'relative',
  display: 'block',
  width: '100%',
  aspectRatio: '1 / 1',
  overflow: 'hidden',
  borderRadius: vars.radius[2],
  background: vars.color.surface.imageBg,
});

export const gridItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  alignItems: 'center',
  textAlign: 'center',
  color: 'inherit',
  textDecoration: 'none',
});

/** 이름 · 일시(주문상세 링크) */
export const gridText = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  alignItems: 'center',
  color: 'inherit',
  textDecoration: 'none',
});

export const tabsBar = style({ padding: `0 ${vars.space[5]}` });

/** 포스터 = 크게 보기 버튼(와이어 `503:16328` CD 이미지 — Tomato 10-24). 글자(이름 · 일시)는 주문상세 링크 */
export const posterButton = style({
  display: 'block',
  width: '100%',
  padding: 0,
  border: 0,
  background: 'none',
  cursor: 'zoom-in',
  borderRadius: vars.radius[2],
});

/** 크게 보기 — 원본 비율 그대로, 화면 높이의 60%까지 */
export const viewerImage = style({
  display: 'block',
  width: '100%',
  height: 'auto',
  maxHeight: '60vh',
  objectFit: 'contain',
  borderRadius: vars.radius[2],
  background: vars.color.surface.imageBg,
});
