import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { sprinkles } from '@/ui/theme/sprinkles.css';
import { vars } from '@/ui/theme/tokens.css';

/** PC 본문 폭(figma-structure 공연홈 PC "본문 1200", 와이어 `626:19888` — 1440에서 좌우 120) */
export const CONTENT_MAX = 1200;
/** 본문 왼쪽 끝 — 모바일 24(GUI `759:22410` 좌우 24), PC는 1200 본문의 왼쪽(캐러셀은 이 선에서 시작해 화면 오른쪽 끝까지 흐른다) */
const edge = `max(${vars.space[5]}, calc((100% - ${CONTENT_MAX}px) / 2))`;

/**
 * 마지막 섹션(두둥 소개) ↔ 푸터 — GUI `759:22572` 아래 안쪽 32 + 푸터 `1383:3429`까지 41(토큰 40으로) = 72.
 */
export const main = style({
  display: 'flex',
  flexDirection: 'column',
  paddingBottom: `calc(${vars.space[6]} + ${vars.space[7]})`,
});

/**
 * 히어로 뒤 사각형 색(GUI `759:22587` "Rectangle 14930" — #5B85FF 직접 값, 변수 없음).
 * 토큰(Blue 300 #5B8FF5)과 달라 Figma 값 그대로 쓴다(figma-deviations-2026-11-07 U3).
 */
const HERO_BG = '#5b85ff';

/**
 * 히어로(GUI `759:22590` 390×390 — 이미지 + 뒤 사각형). 모바일은 화면 폭 정사각, 600부터는 600 정사각을 가운데 두고
 * 양옆을 그림 바탕색으로 채운다(600 이상 넓은 배치는 디자인 없음 — Figma 코멘트).
 */
export const hero = style({
  display: 'flex',
  justifyContent: 'center',
  // FIGMA-CUSTOM: 히어로 뒤 사각형(gui 759:22587, 변수 없는 직접 값) → Figma대로 #5B85FF. 2단계 후보(figma-deviations §5)
  background: HERO_BG,
});

export const heroImage = style({
  display: 'block',
  width: '100%',
  maxWidth: 600,
  height: 'auto',
  aspectRatio: '1 / 1',
});

/** 섹션(GUI `759:22572` 위아래 32) */
export const section = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  paddingTop: vars.space[6],
  '@media': { [media.desktop]: { gap: vars.space[5], paddingTop: vars.space[8] } },
});

export const sectionHead = style({ paddingInline: edge });

/** "더 많은 공연 둘러보기 ↗" — 글자 + ic_diagonal(GUI `759:22411` 간격 12)이 한 링크 */
export const moreLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[3],
  color: vars.color.text.primary,
  textDecoration: 'none',
  borderRadius: vars.radius[2],
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

/** 가로 캐러셀(GUI `759:22414` 카드 163 · 간격 16, 와이어 PC 카드 282 · 간격 24) */
export const carousel = style([
  sprinkles({ listStyle: 'none' }),
  {
    display: 'flex',
    gap: vars.space[4],
    margin: 0,
    padding: 0,
    paddingInline: edge,
    overflowX: 'auto',
    overscrollBehaviorX: 'contain',
    scrollSnapType: 'x mandatory',
    scrollPaddingInline: edge,
    scrollbarWidth: 'none',
    selectors: { '&::-webkit-scrollbar': { display: 'none' } },
    '@media': { [media.desktop]: { gap: vars.space[5] } },
  },
]);

export const carouselItem = style({
  flex: '0 0 163px',
  scrollSnapAlign: 'start',
  '@media': { [media.desktop]: { flexBasis: 282 } },
});

export const empty = style({ paddingInline: edge });

/** 두둥 소개(GUI `759:22549` — 위 섹션과 간격 32(`759:22572` itemSpacing), 제목 ↔ 카드 16, 좌우 24 · PC 본문 1200) */
export const intro = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  width: '100%',
  maxWidth: `calc(${CONTENT_MAX}px + ${vars.space[5]} * 2)`,
  marginInline: 'auto',
  paddingTop: vars.space[6],
  paddingInline: vars.space[5],
  '@media': { [media.desktop]: { gap: vars.space[5], paddingTop: vars.space[8] } },
});

/** "두둥 소개" + ↗(GUI `759:22544` 간격 12) — 링크가 아니다 */
export const introHead = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  color: vars.color.text.primary,
});

/**
 * 빈 파란 카드(GUI `759:22571` 342×258 · 모서리 12 · #5B85FF 직접 값 + 노이즈 효과). 높이는 모든 폭에서 258(🤖 PC 디자인 없음).
 * 노이즈 효과는 CSS로 옮기지 않았다(🤖 — 내용이 들어올 때 디자인을 다시 받는다).
 */
export const introCard = style({
  height: 258,
  borderRadius: vars.radius[4],
  // FIGMA-CUSTOM: 두둥 소개 카드(gui 759:22571, 변수 없는 직접 값) → 히어로 뒤 사각형과 같은 #5B85FF. 2단계 후보(figma-deviations §5)
  background: HERO_BG,
});
