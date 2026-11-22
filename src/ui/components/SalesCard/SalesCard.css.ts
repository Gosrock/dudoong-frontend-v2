import { createContainer, style } from '@vanilla-extract/css';

import { cardHover } from '../../theme/card-hover.css';
import { sprinkles } from '../../theme/sprinkles.css';
import { vars } from '../../theme/tokens.css';

/**
 * GUI `티켓 판매 정보_v2`(`1905:3535`, Design Sync #335 — 2026-11-21). 배경 #F7F7F6 · 모서리 20 · 패딩 16 · 24 · 간격 16.
 * 제목 `Heading/md2 - emphasized` → 본문(가로: 도넛 120 + 간격 24 + 범례 / 세로: 도넛 가운데 → 간격 16 → 범례 전체 폭)
 * → 위 선 #DDDCDA · 위 12 · 오른쪽 정렬 "총액 n"(`Body/md` + `Heading/md - emphasized`, 간격 8).
 * 범례 줄: 점 10 + 간격 8 + 이름(`Label/sm` 회색, 남는 폭 · 1줄 말줄임) + 간격 8 + "N장"(`Label/sm`), 줄 간격 8.
 * 가로/세로는 카드 폭으로(컨테이너 쿼리 — 세로 프레임 폭 258, 가로 326 · 360). 화면 크기 JS 분기를 쓰지 않는다(patterns §1)
 */
const cardContainer = createContainer('sales-card');

/**
 * 안쪽 폭(카드 − 좌우 48)이 이보다 좁으면 세로 — 1133 2단(`680:672` 카드 258 → 210)은 세로, 모바일(326 → 278) · PC(360 → 312)는 가로
 */
const VERTICAL_BELOW = 250;
const vertical = `${cardContainer} (max-width: ${VERTICAL_BELOW}px)`;

export const card = style([
  cardHover,
  {
    containerName: cardContainer,
    containerType: 'inline-size',
    display: 'flex',
    flexDirection: 'column',
    gap: vars.space[4],
    minWidth: 0,
    padding: `${vars.space[4]} ${vars.space[5]}`,
    boxSizing: 'border-box',
    borderRadius: vars.radius[6],
    background: vars.color.surface.container,
  },
]);

export const body = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[5],
  minWidth: 0,
  '@container': {
    [vertical]: { flexDirection: 'column', gap: vars.space[4] },
  },
});

export const donutBox = style({
  position: 'relative',
  flexShrink: 0,
  width: 120,
  height: 120,
});

export const donut = style({ display: 'block', width: 120, height: 120 });

/** 가운데 총 판매 매수(`Heading/lg-emphasized`) */
export const donutCount = style({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const legend = style([
  sprinkles({ listStyle: 'none' }),
  {
    flex: '1 1 0',
    display: 'flex',
    flexDirection: 'column',
    gap: vars.space[2],
    minWidth: 0,
    margin: 0,
    padding: 0,
    '@container': { [vertical]: { alignSelf: 'stretch', flex: '0 0 auto' } },
  },
]);

export const legendItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
  minWidth: 0,
});

export const legendName = style({ flex: '1 1 auto', minWidth: 0 });

export const legendCount = style({ flexShrink: 0 });

/** 점 10 — 판매 0(`data-faded`)은 60% 흐리게(GUI 가이드 `1904:2952`) */
export const dot = style({
  flexShrink: 0,
  width: 10,
  height: 10,
  borderRadius: vars.radius.full,
  selectors: { '[data-faded] > &': { opacity: 0.6 } },
});

/** 합계 줄 — 위 선, 오른쪽 정렬, 위 12 */
export const total = style({
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  gap: vars.space[2],
  paddingTop: vars.space[3],
  borderTop: `1px solid ${vars.color.surface.defaultBorder}`,
});

/**
 * 판매 전 — 가운데 문구. GUI `1913:37905`(모바일) · `745:32726`(PC) 카드 높이 ≈ 163 — 제목 아래 위 32 · 아래 40(값 그대로).
 * 남는 높이는 가운데로
 */
export const empty = style({
  flex: '1 0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${vars.space[6]} 0 ${vars.space[7]}`,
});
