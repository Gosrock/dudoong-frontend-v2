import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 공연 리스트(GUI `759:7895` · PC 와이어 `640:1032`). 모바일 좌우 24, 위 16(헤더 아래), 묶음 간격 16.
 * PC는 본문 1200(1440에서 좌우 120), 검색칸 가운데 600.
 */
export const main = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  width: '100%',
  maxWidth: `calc(1200px + ${vars.space[5]} * 2)`,
  marginInline: 'auto',
  padding: `${vars.space[4]} ${vars.space[5]} ${vars.space[9]}`,
  '@media': { [media.desktop]: { gap: vars.space[5], paddingTop: vars.space[8] } },
});

/** PC 위 일러스트(와이어 `640:1032` — `login` 캐릭터, 1440에서 약 130) */
export const illustration = style({
  display: 'none',
  alignSelf: 'center',
  '@media': { [media.desktop]: { display: 'block' } },
});

export const search = style({
  width: '100%',
  '@media': { [media.desktop]: { maxWidth: 600, alignSelf: 'center' } },
});

/** 태그 칩 · 지난공연보기 · 정렬(GUI `759:8024` — 왼쪽 묶음 간격 16, 오른쪽 끝 정렬) */
export const filters = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.space[4],
});

export const filtersStart = style({ display: 'flex', alignItems: 'center', gap: vars.space[4] });

/** "지난공연보기" + Toggle(GUI `759:8027` 간격 8) */
export const pastToggle = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[2],
});

/** 카드 격자 — 모바일 2열 · 600부터 3열 · PC 4열(plan P5a), 간격 16 · PC 24(와이어) */
export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: vars.space[4],
  margin: 0,
  padding: 0,
  listStyle: 'none',
  '@media': {
    'screen and (min-width: 600px)': { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
    [media.desktop]: { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: vars.space[5] },
  },
});

export const skeletonCard = style({ display: 'flex', flexDirection: 'column', gap: 10 });

export const skeletonPoster = style({ aspectRatio: '163 / 231' });

export const state = style({ paddingBlock: vars.space[8] });
