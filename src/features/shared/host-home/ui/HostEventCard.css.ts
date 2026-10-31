import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';

/**
 * 호스트 홈 가로 줄의 카드 칸 — 카드 모양은 DS `ConcertCard`. 폭만 정한다: 모바일 148(와이어 `503:30867`) · PC 200(🤖 — 가로 줄에 4~5장).
 */
export const item = style({
  flexShrink: 0,
  width: 148,
  scrollSnapAlign: 'start',
  '@media': { [media.desktop]: { width: 200 } },
});

/** 로딩 자리 포스터 — DS ConcertCard 포스터 비율(163:231) */
export const skeletonPoster = style({ width: '100%', aspectRatio: '163 / 231' });
