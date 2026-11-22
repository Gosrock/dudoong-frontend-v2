import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { sprinkles } from '@/ui/theme/sprinkles.css';
import { vars } from '@/ui/theme/tokens.css';
import { typographySpecs } from '@/ui/theme/typography.css';

/** PC 본문 폭(GUI `1974:63988` "본문 영역 (최대 1280)" · 좌우 여백 최소 80 — Design Sync #356 · #357. 옛 와이어 `626:19888`은 1200) */
export const CONTENT_MAX = 1280;
/** 본문 왼쪽 끝 — 모바일 24(GUI `759:22410` 좌우 24) */
const edge = vars.space[5];
/** PC 본문 왼쪽 끝 — 1280 본문의 왼쪽, 좁으면 80(GUI `1974:63987` 좌우 80) */
// space[9]는 PC에서 80(모바일 64 — 쓰지 않음)
const edgeDesktop = `max(${vars.space[9]}, calc((100% - ${CONTENT_MAX}px) / 2))`;

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
  // PC 본문 위 48(GUI `1974:63987` 위 안쪽 48 — space[7]은 PC 48)
  '@media': { [media.desktop]: { gap: vars.space[5], paddingTop: vars.space[7] } },
});

/** 섹션 제목 — 모바일 `Heading/md - emphasized` 20, PC 24/700(GUI `1974:63991` — `Heading/lg - emphasized` 크기) */
export const sectionTitle = style({
  '@media': {
    [media.desktop]: {
      fontSize: typographySpecs.headingLgEmphasized.size,
      fontWeight: typographySpecs.headingLgEmphasized.weight,
    },
  },
});

export const sectionHead = style({
  paddingInline: edge,
  '@media': { [media.desktop]: { paddingInline: edgeDesktop } },
});

/** "더 많은 공연 둘러보기 ↗" — 글자 + ic_diagonal(GUI `759:22411` 간격 12, PC `1974:63990` 8)이 한 링크 */
export const moreLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[3],
  '@media': { [media.desktop]: { gap: vars.space[2] } },
  color: vars.color.text.primary,
  textDecoration: 'none',
  borderRadius: vars.radius[2],
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

/**
 * 모바일 가로 캐러셀(GUI `759:22414` 카드 163 · 간격 16). PC는 고정 격자(가로 스크롤 없음): 1440~ 6칸(GUI `1974:63993` 1280 · 간격 24 ·
 * 카드 193 — #356), 1024~1439 4칸에 앞 4개만(GUI `1989:33304` — #367)
 */
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
    '@media': {
      [media.desktop]: {
        display: 'grid',
        // 1024 ~ 1439는 4칸(GUI `1989:33304` "1024 · 4개" — #367), 1440부터 6칸(`1974:63993`)
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: vars.space[5],
        paddingInline: edgeDesktop,
        overflowX: 'visible',
        scrollSnapType: 'none',
      },
      [media.desktopL]: { gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' },
    },
  },
]);

export const carouselItem = style({
  flex: '0 0 163px',
  minWidth: 0,
  scrollSnapAlign: 'start',
  // 4칸 폭에서는 앞 4개만(#367 "미리 보이는 공연 4개") — 같은 DOM, CSS로(patterns §1). 모바일 캐러셀 · 1440~는 6개
  '@media': {
    [media.desktop]: { selectors: { '&:nth-child(n + 5)': { display: 'none' } } },
    [media.desktopL]: { selectors: { '&:nth-child(n + 5)': { display: 'list-item' } } },
  },
});

/**
 * 끝난 공연 카드 — 흐리게(#356 "진행 중인 공연이 아닌 경우 오퍼시티 낮춰서"). 값은 Figma에 없어 0.4(🤖 — 비활성 표시와 같은 정도, 디자인 없음 코멘트)
 */
export const pastItem = style({ opacity: 0.4 });

export const empty = style({
  paddingInline: edge,
  '@media': { [media.desktop]: { paddingInline: edgeDesktop } },
});

/** 두둥 소개(GUI `759:22549` — 위 섹션과 간격 32(`759:22572` itemSpacing), 제목 ↔ 카드 16, 좌우 24 · PC 본문 1280 · 좌우 80) */
export const intro = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  width: '100%',
  maxWidth: `calc(${CONTENT_MAX}px + ${vars.space[5]} * 2)`,
  marginInline: 'auto',
  paddingTop: vars.space[6],
  paddingInline: vars.space[5],
  '@media': {
    [media.desktop]: {
      maxWidth: `calc(${CONTENT_MAX}px + ${vars.space[9]} * 2)`,
      gap: vars.space[5],
      paddingTop: vars.space[8],
      paddingInline: vars.space[9],
    },
  },
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
