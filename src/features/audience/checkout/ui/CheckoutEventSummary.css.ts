import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';
import { typography, typographySpecs } from '@/ui/theme/typography.css';

/** 공연 요약 줄(GUI `1952:50087` — 위아래 16 · 좌우 24 · 포스터 ↔ 글자 24) */
export const summary = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[5],
  padding: `${vars.space[4]} ${vars.space[5]}`,
  // PC(GUI `1989:31669`) — 왼쪽 열 안이라 바깥 여백 없음
  '@media': { [media.desktop]: { padding: 0 } },
});

/** 포스터(DS `example poster` 인스턴스를 107×151로 키운 것 — 모서리 4.79 → 토큰 4). 없거나 못 읽으면 빈 상자 */
export const poster = style({
  position: 'relative',
  flexShrink: 0,
  width: 107,
  aspectRatio: '107 / 151',
  overflow: 'hidden',
  borderRadius: vars.radius[1],
  background: vars.color.surface.imageBg,
  // PC 193×273 · 모서리 8(GUI `1989:31670`)
  '@media': {
    [media.desktop]: { width: 193, aspectRatio: '193 / 273', borderRadius: vars.radius[2] },
  },
});

export const posterImage = style({
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const text = style({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
});

/**
 * 공연 이름(GUI `1952:50092` — Kartrider Kor 20 · 줄 26, 글자 스타일 없음). 굵기는 `ConcertCard` 제목과 같이 800 —
 * 적재한 Kartrider가 800 한 벌이다(`theme/fonts.ts`)
 */
export const title = style([
  typography.headingMd,
  {
    margin: 0,
    fontFamily: vars.font.display,
    fontWeight: 800,
    color: vars.color.text.primary,
    wordBreak: 'keep-all',
    overflowWrap: 'anywhere',
    // PC 28 · 줄 130%(GUI `1989:31673` Title 스타일)
    '@media': {
      [media.desktop]: {
        fontSize: typographySpecs.title.size,
        lineHeight: typographySpecs.title.lineHeight,
      },
    },
  },
]);

/** 호스트 · 일자 · 시간 · 장소 — 이름 칸과 값 칸 사이 12, 줄 사이 4(GUI `1952:50093`) */
export const facts = style({
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  columnGap: vars.space[3],
  rowGap: vars.space[1],
  margin: 0,
});

/** PC는 16 — 이름 700 · 값 500, 줄 130%(GUI `1989:31677` · `1989:31683`) */
const desktopFact = (weight: number) => ({
  '@media': {
    [media.desktop]: {
      fontSize: typographySpecs.headingSm.size,
      lineHeight: typographySpecs.headingSm.lineHeight,
      letterSpacing: typographySpecs.headingSm.letterSpacing,
      fontWeight: weight,
    },
  },
});

export const factLabel = style([
  typography.labelSm,
  { margin: 0, color: vars.color.text.primary, whiteSpace: 'nowrap', ...desktopFact(700) },
]);

/** 태그 줄 — PC에만 있다(GUI `1989:31681` · 모바일 `1952:50093`에는 없음) */
export const desktopOnly = style({
  display: 'none',
  '@media': { [media.desktop]: { display: 'block' } },
});

/** 값은 같은 글자에 불투명도 0.8(GUI `1952:50099` 등 — 레이어 불투명도) */
export const factValue = style([
  typography.labelSm,
  { margin: 0, minWidth: 0, color: vars.color.text.primary, opacity: 0.8, ...desktopFact(500) },
]);
