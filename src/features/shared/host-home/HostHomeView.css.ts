import { globalStyle, style } from '@vanilla-extract/css';

import { fabBottom, fabClearance } from '@/ui/components/Fab/Fab.css';
import { media } from '@/ui/theme/breakpoints';
import { sprinkles } from '@/ui/theme/sprinkles.css';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 호스트 홈 — **GUI 근거**(모바일 390, `741:30896` 등 — Design Sync #257 · #261 · #262). 값은 Figma 그대로, 간격은 토큰.
 * PC(1024~)는 Ready가 없다 — 와이어 배치(셸 상단 바 아래 둥근 커버 · 왼쪽 정렬 프로필 · 같은 세로 순서)에 모바일 GUI의
 * 글자 · 원 · 카드 모양을 그대로 잇는다(🤖, PR 본문).
 */

export const page = style({
  position: 'relative',
  // [+]가 모바일·PC 모두 떠 있다 — 마지막 줄(빈 상태 문구 · 카드)을 가리지 않게(#92-8)
  paddingBottom: fabClearance.md,
  '@media': { [media.desktop]: { paddingTop: vars.space[5] } },
});

/**
 * 커버 — 모바일은 화면 맨 위부터 폭 가득(Container 좌우 여백 24를 되돌림), 390:246(GUI `741:30950`). 셸 로고 헤더 자리는
 * `HostHomeTopBar`의 표시로 숨는다. PC는 Container 안에 높이 280 · 모서리(🤖 — 와이어 배치 그대로).
 */
export const banner = style({
  position: 'relative',
  marginLeft: -24,
  marginRight: -24,
  aspectRatio: '390 / 246',
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

/** PC 커버 오른쪽 위 ⚙(와이어 `503:30867`). 모바일은 상단 바가 ⚙를 그린다 */
export const desktopSettings = style({
  position: 'absolute',
  top: vars.space[4],
  right: vars.space[4],
  textDecoration: 'none',
  display: 'none',
  '@media': { [media.desktop]: { display: 'inline-flex' } },
});

/**
 * 프로필 묶음 — 모바일 가운데 정렬(GUI), PC 왼쪽 정렬(와이어 배치 🤖). ♡는 이 묶음 위 오른쪽 끝(커버 아래 13, `741:30969`)에 붙는다
 */
export const profile = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  '@media': { [media.desktop]: { alignItems: 'flex-start', textAlign: 'left' } },
});

/** 프로필 100 — 커버 아래 가장자리에 68 걸친다(GUI 225~325, 커버 끝 293). 흰 원 위에 이미지 */
export const logo = style({
  position: 'relative',
  marginTop: -68,
  background: vars.color.background.normal,
});

/** ♡ 44 — 아이콘 24의 오른쪽 끝이 화면 끝에서 28(GUI `741:30969` 338~362), 커버 끝에서 아이콘 위 23 */
export const follow = style({
  position: 'absolute',
  top: 13,
  right: -6,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
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
    // 관심 중 — 빨간 채운 하트(GUI `741:30969` 채움 #e84230 = `brand/accent`)
    '&[aria-pressed="true"]': { color: vars.color.brand.accent },
    '&:disabled': { color: vars.color.interaction.disabled, cursor: 'default' },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

globalStyle(`${follow}[aria-pressed="true"] svg path`, { fill: 'currentColor' });

/** 이름 · 소개 — 프로필 아래 17(GUI 325 → 342), 사이 4 */
export const nameBlock = style({ marginTop: 17 });

export const name = style({ overflowWrap: 'anywhere' });

/** 연락처 아이콘 줄 — 소개 아래 16, 원 사이 12(GUI `1478:7248`) */
export const contacts = style([
  sprinkles({ listStyle: 'none' }),
  {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: vars.space[3],
    margin: 0,
    marginTop: vars.space[4],
    padding: 0,
    '@media': { [media.desktop]: { justifyContent: 'flex-start' } },
  },
]);

/** 연락처 원 36 — GUI 로컬 컴포넌트 "호스트홈_연락처"(`1478:7210`) 채움 `surface/container`, 아이콘 24 */
export const contactButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
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

/** 멤버 수 · 개설일 — 연락처 아래 16, 묶음 사이 12 · 아이콘–글자 4(GUI `741:30912`) */
export const meta = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  marginTop: vars.space[4],
});

export const metaItem = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[1],
  color: vars.color.text.secondaryLabel,
});

/** 메타 줄 아이콘은 16(GUI) — 코드 아이콘은 24만 있어 CSS로 줄인다(AccountMenu와 같은 방식) */
export const metaIcon = style({ width: 16, height: 16, flexShrink: 0 });

/** 멤버 · 공연 리스트 — 프로필 묶음 아래 17 + 위 여백 12, 섹션 사이 24(GUI `741:30919` · `741:30920`) */
export const sections = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[5],
  marginTop: 17,
  paddingTop: vars.space[3],
});

/** 섹션 — 위 16, 제목과 내용 사이 16(GUI `741:30922` · `741:30942`) */
export const section = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  paddingTop: vars.space[4],
});

export const sectionTitle = style({ display: 'flex', alignItems: 'center' });

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

/** 제목 옆 > 20(GUI `741:30925`) */
export const sectionChevron = style({ width: 20, height: 20, flexShrink: 0 });

/** 가로로 넘기는 줄(멤버 · 공연) — 모바일은 화면 끝까지 넘친다, 사이 16 */
export const scroller = style([
  sprinkles({ listStyle: 'none' }),
  {
    display: 'flex',
    gap: vars.space[4],
    margin: 0,
    marginLeft: -24,
    marginRight: -24,
    paddingLeft: 24,
    paddingRight: 24,
    paddingBottom: vars.space[1],
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
  },
]);

/** 멤버 칸 — Avatar 60 + 이름 Label/sm, 사이 4(GUI `741:30927`) */
export const member = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.space[1],
  flexShrink: 0,
  width: 60,
  scrollSnapAlign: 'start',
});

export const memberName = style({ width: '100%' });

/** 가로 줄 끝의 다음 페이지 감지 · 스피너 자리 */
export const sentinel = style({
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 48,
});

/** 오른쪽 아래 [+] 56(GUI `741:30958` — 화면 끝에서 오른쪽 21 · 아래 25). PC도 같은 자리(🤖) */
export const fab = style({
  position: 'fixed',
  right: vars.space[5],
  bottom: fabBottom,
  zIndex: vars.zIndex.header,
  textDecoration: 'none',
});
