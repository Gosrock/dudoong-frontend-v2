import { style } from '@vanilla-extract/css';

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
  aspectRatio: '163 / 231',
  overflow: 'hidden',
  borderRadius: vars.radius[2],
  background: vars.color.surface.imageBg,
});

export const posterImage = style({
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const meta = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  minWidth: 0,
});

export const dateRow = style({ display: 'flex', alignItems: 'center', gap: vars.space[1] });

export const date = style({ flex: '1 1 auto', minWidth: 0 });

/** 제목은 Kartrider Kor ExtraBold 18(Title 스타일 미연결 — design-system §1·§5 `titleSm` 요청). 크기·줄높이는 headingMd2Emphasized(18/130%) */
export const title = style({ fontFamily: vars.font.display, wordBreak: 'keep-all' });
