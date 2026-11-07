import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { sprinkles } from '@/ui/theme/sprinkles.css';
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
export const grid = style([
  sprinkles({ listStyle: 'none' }),
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: vars.space[4],
    margin: 0,
    padding: 0,
    '@media': {
      'screen and (min-width: 600px)': { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
      [media.desktop]: { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: vars.space[5] },
    },
  },
]);

/** 카드 뼈대 — `ConcertCard`의 포스터 · 글자 간격 10과 같게(토큰에 10이 없다 — DS 카드 값) */
export const skeletonCard = style({ display: 'flex', flexDirection: 'column', gap: 10 });

export const skeletonPoster = style({ aspectRatio: '163 / 231' });

export const state = style({ paddingBlock: vars.space[8] });

/** 검색 결과 없음(GUI `1184:33951` — 위아래 40, 그림 100, 그림 · 문구 간격 12, 문구 둘 간격 4, 가운데) */
export const noResult = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.space[3],
  paddingBlock: vars.space[7],
  textAlign: 'center',
});

export const noResultTexts = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
});

/** "이런 공연은 어때요?" 묶음(GUI `1184:33998` — 결과 없음 묶음과 간격 16(main gap), 문구 · 카드 간격 16) */
export const recommended = style({ display: 'flex', flexDirection: 'column', gap: vars.space[4] });

/**
 * 추천 카드 칸. 6장(모바일 2열 3줄 · 600~ 3열 2줄)인데 PC 4열에서는 둘째 줄이 2장만 남아 앞 4장(한 줄)만 보인다.
 * 🤖 Claude 판단(PC 추천은 디자인 없음 — 2026-11-07). 되돌리려면 이 `selectors`를 지운다
 */
export const recommendedItem = style({
  '@media': {
    [media.desktop]: { selectors: { '&:nth-child(n + 5)': { display: 'none' } } },
  },
});
