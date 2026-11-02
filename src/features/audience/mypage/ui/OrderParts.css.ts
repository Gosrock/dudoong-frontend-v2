import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/** 포스터 상자(와이어 회색 상자 — 서버 포스터가 없으면 `surface.imageBg`, Q26 기본안) */
export const poster = style({
  position: 'relative',
  flexShrink: 0,
  width: 76,
  aspectRatio: '3 / 4',
  overflow: 'hidden',
  borderRadius: vars.radius[2],
  background: vars.color.surface.imageBg,
  '@media': { [media.desktop]: { width: 120 } },
});

/** 포스터 위 D-n · 공연 종료 칩(와이어 `128:2772` 오른쪽 위) */
export const posterChip = style({
  position: 'absolute',
  top: vars.space[1],
  right: vars.space[1],
});

export const chipRow = style({ display: 'inline-flex', flexWrap: 'wrap', gap: vars.space[1] });
