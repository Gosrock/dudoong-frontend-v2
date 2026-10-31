import { createVar, globalStyle, style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 티켓탭 — GUI 섹션 `908:3276`(모바일 390). 수치는 `908:11275`(티켓 카드) · `908:11335`(입장 QR)에서 읽었다.
 * 카드 294×416 · 이웃 카드 200×284(= 0.68배) · 카드 사이 24 · 모서리 16.
 */

/** 가운데 카드 폭(Figma 294). 좁은 폰에서는 화면 폭의 75%까지 줄인다 */
const cardWidth = createVar();
/** 이웃 카드 배율(Figma 200/294) */
const NEIGHBOR_SCALE = 200 / 294;
/** 레이아웃 칸 사이(겹침) — 줄어든 이웃과 가운데 카드 사이가 눈에 24가 되게: 24 − 294×(1−0.68)/2 */
const overlap = `calc(${vars.space[5]} - ${cardWidth} * ${(1 - NEIGHBOR_SCALE) / 2})`;

export const page = style({
  vars: { [cardWidth]: 'min(294px, 75vw)' },
  flex: '1 0 auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
  paddingBottom: vars.space[9],
  '@media': { [media.desktop]: { paddingTop: vars.space[5] } },
});

// ─── 공지 바(`939:29784` "Frame 1707480432") ─────────────────────

export const noticeWrap = style({
  width: '100%',
  // 모바일 폭 그대로. PC는 가운데 390(디자인 없음 — implementation-log P8-V)
  maxWidth: 390,
  padding: `${vars.space[2]} ${vars.space[5]}`,
});

export const noticeBar = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
  padding: vars.space[3],
  borderRadius: vars.radius[5],
  // Figma #202020 직접 값 → 가장 가까운 의미 색(Neutral 700 #232220)
  background: vars.color.surface.inverseHover,
  minWidth: 0,
});

export const noticeText = style({ flex: '1 1 auto', minWidth: 0 });

export const noticeLink = style({
  flexShrink: 0,
  color: vars.color.brand.accent,
  textDecoration: 'none',
  selectors: { '&:hover': { textDecoration: 'underline' } },
});

// ─── 카드 캐러셀(`908:11286` "Frame 1707480434") ──────────────────

export const hint = style({ paddingTop: vars.space[4], minHeight: 17 + 16 });

export const carousel = style({
  // 칸 위치(offsetLeft)를 캐러셀 기준으로 재려고
  position: 'relative',
  display: 'flex',
  width: '100%',
  overflowX: 'auto',
  overflowY: 'hidden',
  scrollSnapType: 'x mandatory',
  scrollbarWidth: 'none',
  overscrollBehaviorX: 'contain',
  paddingInline: `calc(50% - ${cardWidth} / 2)`,
  // 그림자 · 겹친 카드(회전)가 잘리지 않게
  paddingBlock: vars.space[5],
  selectors: { '&::-webkit-scrollbar': { display: 'none' } },
});

export const item = style({
  flex: `0 0 ${cardWidth}`,
  scrollSnapAlign: 'center',
  marginRight: overlap,
  transform: `scale(${NEIGHBOR_SCALE})`,
  transition: 'transform 0.2s ease',
  selectors: {
    '&:last-child': { marginRight: 0 },
    '&[data-active="true"]': { transform: 'scale(1)' },
  },
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } },
});

/** 카드 + 겹친 카드(한 주문 2장 이상 — `908:11332` 회전 4.7°, 포스터 위 검정 40%) */
export const cardFrame = style({
  position: 'relative',
  display: 'block',
  width: '100%',
  aspectRatio: '294 / 416',
  padding: 0,
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  selectors: { '&:focus-visible': { outline: 'none' } },
});

export const stack = style({
  position: 'absolute',
  inset: 0,
  borderRadius: vars.radius[5],
  overflow: 'hidden',
  transform: 'rotate(4.7deg) scale(1.04)',
  background: vars.color.surface.imageBg,
  boxShadow: vars.shadow.drop,
  selectors: {
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      background: `color-mix(in srgb, ${vars.color.background.dark} 40%, transparent)`,
    },
  },
});

export const card = style({
  position: 'absolute',
  inset: 0,
  borderRadius: vars.radius[5],
  overflow: 'hidden',
  background: vars.color.surface.imageBg,
  boxShadow: vars.shadow.drop,
  selectors: {
    [`${cardFrame}:focus-visible > &`]: {
      outline: `2px solid ${vars.color.brand.primary}`,
      outlineOffset: 2,
    },
  },
});

export const posterImage = style({
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const posterPlaceholder = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
});

export const chipList = style({
  position: 'absolute',
  top: vars.space[3],
  right: vars.space[3],
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: vars.space[1],
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

/** 카드 아래 공연명 · 일시 · 티켓 이름 · [주문상세](`908:11290`) */
export const info = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.space[3],
  width: '100%',
  maxWidth: 390,
  paddingInline: vars.space[5],
  textAlign: 'center',
});

// ─── 입장 QR 층(`908:11335`) ────────────────────────────────────

export const layerOverlay = style({
  position: 'fixed',
  inset: 0,
  // 선물 시트(바텀시트)가 이 층 위에 떠야 해서 시트와 같은 단 — 나중에 붙은 포털이 위
  zIndex: vars.zIndex.sheet,
  background: vars.color.overlay.dim,
});

/** 카드가 티켓탭의 같은 자리에 오도록 위 여백을 연 쪽이 준다(`--layer-top`) */
export const layerTop = createVar();

export const layer = style({
  vars: { [cardWidth]: 'min(294px, 75vw)', [layerTop]: vars.space[10] },
  position: 'fixed',
  inset: 0,
  // 선물 시트(바텀시트)가 이 층 위에 떠야 해서 시트와 같은 단 — 나중에 붙은 포털이 위
  zIndex: vars.zIndex.sheet,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  overflowY: 'auto',
  paddingTop: layerTop,
  paddingBottom: vars.space[9],
  outline: 'none',
});

/** [선물] 버튼(왼쪽, 카드 왼쪽 끝) + "바깥을 탭하여 QR 끄기"(가운데) */
export const layerTopRow = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: cardWidth,
  minHeight: 46,
});

export const layerGift = style({ position: 'absolute', left: 0, top: 0 });

export const layerCarousel = style([carousel, { paddingBlock: vars.space[3] }]);

/** 카드 뒷면(`908:11563` "Frame 1707480443" — #F7F7F6 · 모서리 16) */
export const back = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  aspectRatio: '294 / 416',
  borderRadius: vars.radius[5],
  background: vars.color.surface.container,
  boxShadow: vars.shadow.drop,
  border: 'none',
  padding: 0,
  cursor: 'default',
  selectors: {
    // 이웃 티켓(`908:11562` — #DDDCDA 빈 카드)
    '&[data-active="false"]': { background: vars.color.interaction.disabled, cursor: 'pointer' },
  },
});

/** 뒷면 내용(`908:11564` — 폭 220, 간격 24) */
export const backBody = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.space[5],
  width: '75%',
  textAlign: 'center',
});

export const backArt = style({ width: '100%', aspectRatio: '1 / 1' });

globalStyle(`${backArt} > img`, { width: '100%', height: '100%' });

/** 티켓 번호(`908:11579` — 120×30 검정, 입장 완료는 #DDDCDA `908:16754`) */
export const ticketNo = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 120,
  minHeight: 30,
  padding: `${vars.space[1]} ${vars.space[2]}`,
  background: vars.color.background.dark,
  selectors: { '&[data-dim="true"]': { background: vars.color.interaction.disabled } },
});

export const layerInfo = style([info, { paddingTop: vars.space[3] }]);

/** 빈 상태(`908:3137`) — 그림 · 문구는 가운데, [공연 둘러보기](Primary Large)는 아래 */
export const empty = style({
  flex: '1 0 auto',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  gap: vars.space[6],
  width: '100%',
  maxWidth: 390,
  padding: `${vars.space[10]} ${vars.space[5]} 0`,
});
