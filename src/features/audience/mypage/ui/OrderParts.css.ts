import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 포스터 상자 — DS `example poster` mobile 94×133(GUI `1047:32364`). 서버 포스터가 없으면 `surface.imageBg`(Q26 기본안).
 * PC 프레임이 없어 PC는 와이어 때 폭 120을 그대로 둔다.
 */
export const poster = style({
  position: 'relative',
  flexShrink: 0,
  width: 94,
  aspectRatio: '94 / 133',
  overflow: 'hidden',
  borderRadius: vars.radius[1],
  background: vars.color.surface.imageBg,
  '@media': { [media.desktop]: { width: 120 } },
});

/** 요약 글자 칸 — GUI `Frame 16468`(위아래 12) */
export const summaryText = style({
  flex: 1,
  minWidth: 0,
  paddingTop: vars.space[3],
  paddingBottom: vars.space[3],
});

export const chipRow = style({ display: 'inline-flex', flexWrap: 'wrap', gap: vars.space[1] });
