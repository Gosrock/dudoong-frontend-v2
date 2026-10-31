import { globalStyle, style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 호스트 홈 — **와이어 근거**(`503:30867` 마스터·매니저 · `529:34027` 멤버 · `503:30477` 관객, 모바일 390).
 * GUI `741:30896`·`741:30970`은 Ready for dev가 아니라 모양을 가져오지 않는다(design-workflow §3). 와이어에 PC가 없어
 * PC(1024~)는 관객 PC 규칙(`Container` 최대 폭) 안에 같은 세로 배치를 둔다(🤖). 값은 구조에 필요한 것만 와이어에서,
 * 나머지는 DS 토큰.
 */

export const page = style({
  position: 'relative',
  paddingBottom: vars.space[10],
  '@media': { [media.desktop]: { paddingTop: vars.space[5], paddingBottom: vars.space[9] } },
});

/**
 * 배너 — 모바일은 화면 폭 가득(Container 좌우 여백 24를 되돌림), 비율 390:230(와이어). PC는 Container 안에 높이 280·모서리
 * (🤖 — 와이어에 PC 없음).
 */
export const banner = style({
  position: 'relative',
  marginLeft: -24,
  marginRight: -24,
  aspectRatio: '390 / 230',
  background: vars.color.surface.imageBg,
  overflow: 'hidden',
  '@media': {
    [media.desktop]: {
      marginLeft: 0,
      marginRight: 0,
      aspectRatio: 'auto',
      height: 280,
      borderRadius: vars.radius[5],
    },
  },
});

export const cover = style({
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

/** 배너 오른쪽 위 ⚙(와이어 `503:30867`) */
export const settings = style({
  position: 'absolute',
  top: vars.space[4],
  right: vars.space[4],
  textDecoration: 'none',
});

/** 원형 로고 80 — 배너 아래 가장자리에 반쯤 걸친다(와이어) */
export const logo = style({
  position: 'relative',
  marginTop: -40,
  border: `2px solid ${vars.color.background.normal}`,
  boxSizing: 'content-box',
});

export const profile = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  paddingTop: vars.space[2],
});

export const nameRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.space[3],
});

export const meta = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
});

export const metaItem = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[1],
  color: vars.color.text.secondaryLabel,
});

/** 메타 줄 아이콘은 20(와이어) — 코드 아이콘은 24만 있어 CSS로 줄인다(AccountMenu와 같은 방식) */
export const metaIcon = style({ width: 20, height: 20, flexShrink: 0 });

export const introduce = style({ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' });

export const contacts = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.space[2],
  margin: 0,
  marginTop: vars.space[2],
  padding: 0,
  listStyle: 'none',
});

/** 연락처 아이콘 원 40(와이어 회색 원) */
export const contactButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  padding: 0,
  border: 0,
  borderRadius: vars.radius.full,
  background: vars.color.surface.container,
  color: vars.color.text.primaryLabel,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: vars.color.surface.container2 },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

/** ♡ — 아이콘만 있는 버튼. 관심 중이면 채운 하트(DS에 filled가 없어 선 아이콘 안을 칠한다, 🤖) */
export const follow = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 44,
  height: 44,
  padding: 0,
  border: 0,
  borderRadius: vars.radius.full,
  background: 'transparent',
  color: vars.color.text.primaryLabel,
  cursor: 'pointer',
  textDecoration: 'none',
  selectors: {
    '&[aria-pressed="true"]': { color: vars.color.brand.primary },
    '&:disabled': { color: vars.color.interaction.disabled, cursor: 'default' },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

globalStyle(`${follow}[aria-pressed="true"] svg path`, { fill: 'currentColor' });

export const section = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  marginTop: vars.space[7],
});

/** 가로로 넘기는 줄(멤버 · 공연) — 모바일은 화면 끝까지 넘친다 */
export const scroller = style({
  display: 'flex',
  gap: vars.space[4],
  margin: 0,
  marginLeft: -24,
  marginRight: -24,
  paddingLeft: 24,
  paddingRight: 24,
  paddingBottom: vars.space[1],
  listStyle: 'none',
  overflowX: 'auto',
  scrollSnapType: 'x proximity',
  scrollPaddingLeft: 24,
  scrollbarWidth: 'none',
  '@media': {
    [media.desktop]: {
      marginLeft: 0,
      marginRight: 0,
      paddingLeft: 0,
      paddingRight: 0,
      scrollPaddingLeft: 0,
      scrollbarWidth: 'thin',
    },
  },
});

export const member = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.space[2],
  flexShrink: 0,
  width: 52,
  scrollSnapAlign: 'start',
});

export const sectionLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  color: vars.color.text.primaryLabel,
  textDecoration: 'none',
  borderRadius: vars.radius[1],
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

/** 가로 줄 끝의 다음 페이지 감지 · 스피너 자리 */
export const sentinel = style({
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 48,
});

/** 오른쪽 아래 [+ 새 공연 만들기](와이어 `503:30867`) — PC도 같은 자리(🤖) */
export const fab = style({
  position: 'fixed',
  right: vars.space[5],
  bottom: `calc(${vars.space[5]} + env(safe-area-inset-bottom))`,
  zIndex: vars.zIndex.header,
  textDecoration: 'none',
});

/** 화면에는 안 보이고 읽기 프로그램만 읽는 글자(멤버 수·개설일의 뜻) */
export const srOnly = style({
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
});
