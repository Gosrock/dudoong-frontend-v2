import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 공연 상세 — 모바일 와이어 `121:1216`, PC 와이어 `640:1957`(두 열). 서버·클라이언트가 같은 DOM을 그리고
 * 모바일/PC에서 보일 것은 CSS가 정한다(patterns §1). 크기는 와이어 값 중 구조에 필요한 것만(포스터 비율 282:400,
 * 오른쪽 카드 382) — 그 밖은 DS 토큰.
 */

export const mobileOnly = style({ '@media': { [media.desktop]: { display: 'none' } } });
export const desktopOnly = style({
  display: 'none',
  '@media': { [media.desktop]: { display: 'block' } },
});

export const page = style({
  paddingTop: vars.space[4],
  paddingBottom: vars.space[7],
  '@media': { [media.desktop]: { paddingTop: vars.space[7], paddingBottom: vars.space[9] } },
});

/** PC 두 열 — 왼쪽 본문 + 오른쪽 고정 카드 382(와이어 `640:1957`) */
export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  '@media': {
    [media.desktop]: {
      gridTemplateColumns: 'minmax(0, 1fr) 382px',
      columnGap: vars.space[5],
      alignItems: 'start',
    },
  },
});

export const mainCol = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[6],
  minWidth: 0,
});

/** 포스터 + 요약. 모바일은 위아래, PC는 포스터 282 옆에 정보 표 */
export const summary = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  '@media': { [media.desktop]: { flexDirection: 'row', gap: vars.space[5] } },
});

export const posterWrap = style({
  position: 'relative',
  width: '100%',
  aspectRatio: '282 / 400',
  borderRadius: vars.radius[2],
  overflow: 'hidden',
  background: vars.color.surface.imageBg,
  flexShrink: 0,
  '@media': { [media.desktop]: { width: 282 } },
});

export const poster = style({
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

/** 모바일 포스터 오른쪽 위 공유 버튼(와이어 `121:1216`) */
export const posterShare = style({
  position: 'absolute',
  top: vars.space[3],
  right: vars.space[3],
  '@media': { [media.desktop]: { display: 'none' } },
});

export const info = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  flex: 1,
  minWidth: 0,
});

export const infoRows = style({ display: 'flex', flexDirection: 'column', gap: vars.space[3] });

export const chips = style({ listStyle: 'none', margin: 0, padding: 0 });

export const iconRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
  color: vars.color.text.primary,
  textDecoration: 'none',
  minWidth: 0,
});

export const iconRowIcon = style({
  display: 'inline-flex',
  flexShrink: 0,
  alignSelf: 'flex-start',
});

export const desktopTable = style({
  display: 'none',
  '@media': {
    [media.desktop]: {
      display: 'flex',
      flexDirection: 'column',
      paddingTop: vars.space[2],
      paddingBottom: vars.space[2],
      borderTop: `1px solid ${vars.color.surface.defaultBorder}`,
      borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
    },
  },
});

export const hostValue = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  flexWrap: 'wrap',
});

export const textLink = style({ color: 'inherit', textDecoration: 'underline' });

/** 모바일 티켓 카드 · PC 오른쪽 카드 — 테두리 상자(와이어). 그림자는 짓지 않는다 */
export const card = style({
  border: `1px solid ${vars.color.surface.defaultBorder}`,
  borderRadius: vars.radius[4],
  padding: vars.space[4],
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
});

export const aside = style([
  card,
  {
    display: 'none',
    '@media': {
      [media.desktop]: {
        display: 'flex',
        gap: vars.space[4],
        padding: vars.space[5],
        position: 'sticky',
        top: vars.space[5],
      },
    },
  },
]);

export const tabPanel = style({ paddingTop: vars.space[5] });

/** 모바일 하단 고정 바 [문의][티켓 구매하기] — PC에서는 CSS로 숨긴다(같은 DOM) */
export const bottomBar = style({
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 10,
  display: 'flex',
  gap: vars.space[2],
  padding: vars.space[4],
  paddingBottom: `calc(${vars.space[4]} + env(safe-area-inset-bottom))`,
  background: vars.color.background.normal,
  '@media': { [media.desktop]: { display: 'none' } },
});

/** 하단 고정 바에 본문 끝이 가리지 않게 */
export const bottomSpacer = style({
  height: `calc(56px + ${vars.space[4]} * 2 + env(safe-area-inset-bottom))`,
  '@media': { [media.desktop]: { display: 'none' } },
});

/** 주간 달력 7칸(와이어 `640:1957`) */
export const week = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  rowGap: vars.space[2],
  textAlign: 'center',
  paddingBottom: vars.space[4],
  borderBottom: `1px solid ${vars.color.surface.strongBorder}`,
});

export const weekDay = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  margin: '0 auto',
  borderRadius: vars.radius.full,
  selectors: {
    '&[data-event-day]': { background: vars.color.brand.primary, color: vars.color.text.onBrand },
  },
});
