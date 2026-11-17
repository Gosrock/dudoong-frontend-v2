import { style } from '@vanilla-extract/css';

/**
 * 호스트 홈 가로 줄의 카드 칸 — 카드 모양은 DS `ConcertCard`. 폭 163(모바일 GUI `741:30947` · PC `1495:8993` 같은 폭, #290)
 */
export const item = style({
  flexShrink: 0,
  width: 163,
  scrollSnapAlign: 'start',
});

/** 로딩 자리 포스터 — DS ConcertCard 포스터 비율(163:231) */
export const skeletonPoster = style({ width: '100%', aspectRatio: '163 / 231' });
