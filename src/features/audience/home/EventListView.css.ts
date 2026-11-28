import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { sprinkles } from '@/ui/theme/sprinkles.css';
import { vars } from '@/ui/theme/tokens.css';
import { typographySpecs } from '@/ui/theme/typography.css';

/**
 * 공연 리스트(GUI `759:7895`). 모바일 좌우 24, 위 16(헤더 아래), 묶음 간격 16.
 * PC는 GUI `1979:2257`(1024 — 좌우 40) · `1970:1939`(1440 — 좌우 80, 본문 최대 1280), 위 24 · 아래 80 · 묶음 간격 24(#359 · #368).
 */
export const main = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  width: '100%',
  maxWidth: `calc(1280px + ${vars.space[10]} * 2)`,
  marginInline: 'auto',
  padding: `${vars.space[4]} ${vars.space[5]} ${vars.space[9]}`,
  '@media': {
    [media.desktop]: {
      gap: vars.space[5],
      padding: `${vars.space[5]} ${vars.space[7]} ${vars.space[10]}`,
    },
    [media.desktopL]: { paddingInline: vars.space[10] },
  },
});

/** PC 위 일러스트(GUI `1970:2001` img_login 139×133, 가운데) */
export const illustration = style({
  display: 'none',
  alignSelf: 'center',
  '@media': { [media.desktop]: { display: 'block' } },
});

/**
 * 검색칸 — PC는 카드 격자 가운데 열 폭과 같다(GUI 1024 `1979:2473` 460 = 4열 중 2열, 1440 `1970:2055` 846 = 6열 중 4열).
 * 열 폭 = (100% − 간격 24 × (열 − 1)) / 열
 */
export const search = style({
  width: '100%',
  '@media': {
    [media.desktop]: {
      alignSelf: 'center',
      width: `calc((100% - ${vars.space[5]} * 3) / 4 * 2 + ${vars.space[5]})`,
    },
    [media.desktopL]: {
      width: `calc((100% - ${vars.space[5]} * 5) / 6 * 4 + ${vars.space[5]} * 3)`,
    },
  },
});

/** 태그 칩 · 지난공연보기 · 정렬(GUI `759:8024` — 왼쪽 묶음 간격 16, 오른쪽 끝 정렬) */
export const filters = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.space[4],
});

export const filtersStart = style({ display: 'flex', alignItems: 'center', gap: vars.space[4] });

/**
 * "지난공연보기" + Toggle(GUI `759:8027` 간격 8 — 모바일은 글자 12 → Toggle Size=18, 2026-11-28 #390 · #391).
 * PC는 Toggle → 글자 14(`labelMd`, GUI `1970:2068` · `1979:2268`)
 */
export const pastToggle = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[2],
  '@media': { [media.desktop]: { flexDirection: 'row-reverse' } },
});

const labelMd = typographySpecs.labelMd;
export const pastToggleLabel = style({
  '@media': {
    [media.desktop]: {
      fontSize: labelMd.size,
      fontWeight: labelMd.weight,
      lineHeight: labelMd.lineHeight,
      letterSpacing: labelMd.letterSpacing,
    },
  },
});

/** 카드 격자 — 모바일 2열 · 600부터 3열 · PC 4열(GUI `1979:2257`) · 1440부터 6열(GUI `1970:1939`, #359), 간격 16 · PC 24 */
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
      [media.desktopL]: { gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' },
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
 * 1440부터 6열이라 6장 한 줄(#359). 🤖 Claude 판단(PC 추천은 디자인 없음 — 2026-11-07). 되돌리려면 이 `selectors`를 지운다
 */
export const recommendedItem = style({
  '@media': {
    [media.desktop]: { selectors: { '&:nth-child(n + 5)': { display: 'none' } } },
    [media.desktopL]: { selectors: { '&:nth-child(n + 5)': { display: 'list-item' } } },
  },
});

/** 정렬 표시(DS SortButton `759:8031` — 글자 + chevron-down 12, 간격 4, `text/primary`) */
export const sort = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[1],
  color: vars.color.text.primary,
});
