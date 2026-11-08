import { style } from '@vanilla-extract/css';

import { palette } from '../../theme/palette';
import { vars } from '../../theme/tokens.css';

/**
 * Figma ConcertCard(디자인 시스템, GUI 공연홈 `759:22415`) — 포스터 163×231 모서리 8, 간격 10, 날짜·제목 묶음 간격 4.
 * 폭은 놓이는 칸이 정한다(목록 2·3·4열, 캐러셀 고정 폭). 포스터는 Figma 비율(163:231)을 지킨다.
 */
export const root = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  minWidth: 0,
  color: vars.color.text.primary,
  textDecoration: 'none',
  outline: 'none',
  selectors: {
    '&:focus-visible': {
      outline: `2px solid ${vars.color.brand.primary}`,
      outlineOffset: 2,
      borderRadius: vars.radius[2],
    },
  },
});

export const poster = style({
  position: 'relative',
  display: 'block',
  width: '100%',
  // 포스터 163×230(DS `121:1008` 230.6 — 분류표 A27 값 그대로 230, M-2 2026-11-08)
  aspectRatio: '163 / 230',
  overflow: 'hidden',
  borderRadius: vars.radius[2],
  background: vars.color.surface.imageBg,
});

/** 포스터 + 얹는 표시(`badge`)의 기준 상자 */
export const posterWrap = style({ position: 'relative', display: 'block' });

export const badge = style({
  position: 'absolute',
  top: vars.space[2],
  left: vars.space[2],
  display: 'flex',
});

export const posterImage = style({
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

/**
 * 지난 공연 포스터(GUI `939:34059` 채움 — 검정 40% 위에 이미지 80%). 흰 바탕 위에서 회색으로 바랜다.
 * 의미 색 변수가 없어 원시 색(Common black) 그대로 — design-system §5 요청 거리
 */
export const posterEnded = style({
  background: `color-mix(in srgb, ${palette.common.black} 40%, transparent)`,
});

export const posterImageEnded = style({ opacity: 0.8 });

export const meta = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  minWidth: 0,
});

/**
 * 날짜 줄 — 높이를 글자 줄(Label/sm 12 × 1.2 = 14.4, GUI `121:1013`)에 맞춘다. 끝의 이동 표시(`LinkProgress` sm 16)가
 * 줄을 16으로 키워 날짜 ↔ 제목 간격이 Figma(4)보다 벌어지던 것을 막는다 — 표시는 위아래로 넘쳐 그려진다(Design Sync 2026-11-08 밤)
 */
export const dateRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[1],
  height: 14.4,
  overflow: 'visible',
});

export const date = style({ flex: '1 1 auto', minWidth: 0 });

/**
 * 제목은 Kartrider Kor ExtraBold 18(Title 스타일 미연결 — design-system §1·§5 `titleSm` 요청). 크기·줄높이는
 * headingMd2Emphasized(18/130%), 굵기는 Figma ExtraBold(800) — 적재한 Kartrider가 800 한 벌이다(`theme/fonts.ts`)
 */
export const title = style({
  fontFamily: vars.font.display,
  fontWeight: 800,
  wordBreak: 'keep-all',
});
