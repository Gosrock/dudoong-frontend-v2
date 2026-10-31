import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { colors } from '@/ui/theme/colors';
import { vars } from '@/ui/theme/tokens.css';

/** PC 본문 폭(figma-structure 공연홈 PC "본문 1200", 와이어 `626:19888` — 1440에서 좌우 120) */
export const CONTENT_MAX = 1200;
/** 본문 왼쪽 끝 — 모바일 24(GUI `759:22410` 좌우 24), PC는 1200 본문의 왼쪽(캐러셀은 이 선에서 시작해 화면 오른쪽 끝까지 흐른다) */
const edge = `max(${vars.space[5]}, calc((100% - ${CONTENT_MAX}px) / 2))`;

export const main = style({
  display: 'flex',
  flexDirection: 'column',
  paddingBottom: vars.space[9],
});

/**
 * 히어로(GUI `759:22590` 390×390 — 이미지 + 뒤 사각형). 모바일은 화면 폭 정사각, 600부터는 600 정사각을 가운데 두고
 * 양옆을 그림 바탕색과 가장 가까운 원시 색으로 채운다(PC 히어로는 디자인 없음 — Figma 코멘트).
 */
export const hero = style({
  display: 'flex',
  justifyContent: 'center',
  // FIGMA-CUSTOM: 히어로 뒤 사각형(gui 759:22587 "Rectangle 14930" #5B85FF, 변수 없음) 커스텀 → 원시 색 blue300(#5B8FF5) 반올림. DS 후보(design-system §3)
  background: colors.blue300,
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

/** "더 많은 공연 둘러보기 →" — 글자 + 원형 화살표(GUI `759:22411` 간격 12)가 한 링크 */
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

/** 원형 화살표 — DS Button round Primary(56)를 Figma 인스턴스 크기 30으로(GUI `759:22413`) */
export const moreArrow = style({ width: 30, height: 30, pointerEvents: 'none' });

/** 가로 캐러셀(GUI `759:22414` 카드 163 · 간격 16, 와이어 PC 카드 282 · 간격 24) */
export const carousel = style({
  display: 'flex',
  gap: vars.space[4],
  margin: 0,
  padding: 0,
  paddingInline: edge,
  listStyle: 'none',
  overflowX: 'auto',
  overscrollBehaviorX: 'contain',
  scrollSnapType: 'x mandatory',
  scrollPaddingInline: edge,
  scrollbarWidth: 'none',
  selectors: { '&::-webkit-scrollbar': { display: 'none' } },
  '@media': { [media.desktop]: { gap: vars.space[5] } },
});

export const carouselItem = style({
  flex: '0 0 163px',
  scrollSnapAlign: 'start',
  '@media': { [media.desktop]: { flexBasis: 282 } },
});

export const empty = style({ paddingInline: edge });
