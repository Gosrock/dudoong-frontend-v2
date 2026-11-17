import { globalStyle, style } from '@vanilla-extract/css';

import { fabBottom, fabClearance } from '@/ui/components/Fab/Fab.css';
import { media } from '@/ui/theme/breakpoints';
import { sprinkles } from '@/ui/theme/sprinkles.css';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 호스트 홈 — **GUI 근거**(모바일 390 `741:30896` 등 — Design Sync #257 · #261 · #262 · #279 · #280, PC 1440 `1495:8685` ·
 * `1495:9022` · `1495:9120` — #290, 2026-11-16 Ready). 값은 Figma 그대로, 간격은 토큰.
 * 커버는 화면 폭 가득(모바일 2:1 · PC 높이 300), 본문은 모바일 좌우 24 · PC 가운데 960(1024~1279는 좌우 32를 남기고 줄어든다 🤖).
 */

export const page = style({
  position: 'relative',
  width: '100%',
  // 모바일은 [+]가 떠 있다 — 마지막 줄(빈 상태 문구 · 카드)을 가리지 않게(#92-8). PC는 [+]가 없다(`1495:8685`) — 아래 80(🤖)
  paddingBottom: fabClearance.md,
  '@media': { [media.desktop]: { paddingBottom: vars.space[10] } },
});

/** 본문 칸 — 모바일 좌우 24, PC 가운데 960(GUI `1522:35938` x 240~1200) */
export const body = style({
  position: 'relative',
  paddingLeft: 24,
  paddingRight: 24,
  '@media': {
    [media.desktop]: {
      maxWidth: 960 + 32 * 2,
      marginLeft: 'auto',
      marginRight: 'auto',
      paddingLeft: 32,
      paddingRight: 32,
    },
  },
});

/**
 * 커버 — 화면 폭 가득. 모바일 2:1(GUI `741:30950` 390×195 — #279), 셸 로고 헤더 자리는 `HostHomeTopBar`의 표시로 숨는다.
 * PC는 셸 상단 바 아래 높이 300(`1495:8779` 1440×300 — 2:1 이미지의 가운데가 보인다)
 */
export const banner = style({
  position: 'relative',
  aspectRatio: '2 / 1',
  background: vars.color.surface.imageBg,
  overflow: 'hidden',
  '@media': { [media.desktop]: { aspectRatio: 'auto', height: 300 } },
});

/** 커버 위 딤 30%(GUI "dimmed" `1522:13269` · 기본 커버 `1522:13532` — #279 · #280, 흰 원 버튼이 잘 보이게) */
export const coverDim = style({
  position: 'absolute',
  inset: 0,
  background: vars.color.overlay.coverDim,
  pointerEvents: 'none',
});

export const cover = style({
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

/** PC 커버 오른쪽 위 흰 원 ⚙ 44(GUI `1495:8784` — 커버 위 16 · 오른쪽 24). 모바일은 `HostCoverButtons`가 그린다 */
export const desktopSettings = style({
  position: 'absolute',
  top: vars.space[4],
  right: vars.space[5],
  display: 'none',
  '@media': { [media.desktop]: { display: 'inline-flex' } },
});

/** 프로필 묶음 — 가운데 정렬(모바일 · PC 모두). ♡는 이 묶음 위에 붙는다 */
export const profile = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
});

/**
 * 프로필 원 — 모바일 100이 커버 아래 가장자리에 68 걸친다(GUI 174~274, 커버 끝 242). PC 140이 70 걸친다(`1495:8782` 288~428,
 * 커버 끝 358). 흰 원 위에 이미지
 */
export const logo = style({
  position: 'relative',
  marginTop: -68,
  background: vars.color.background.normal,
  '@media': { [media.desktop]: { marginTop: -70, width: 140, height: 140 } },
});

/**
 * ♡ 44 — 모바일: 아이콘 24의 오른쪽 끝이 화면 끝에서 28(GUI `741:30969` 338~362), 커버 끝에서 아이콘 위 23.
 * PC: 프로필 가운데에서 오른쪽 147(아이콘 왼쪽 — `1495:8786` x 867, 가운데 720), 커버 끝에서 20
 */
export const follow = style({
  position: 'absolute',
  top: 13,
  right: -6,
  '@media': { [media.desktop]: { top: 10, right: 'auto', left: 'calc(50% + 137px)' } },
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

/** 이름 · 소개 — 프로필 아래 17(GUI 274 → 291), PC 20(`1522:35937` 간격 20), 사이 4. PC는 390 칸(`1495:8788` 안쪽 342) */
export const nameBlock = style({
  marginTop: 17,
  '@media': { [media.desktop]: { marginTop: 20, maxWidth: 342 } },
});

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
  textDecoration: 'none',
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

/**
 * 멤버 · 공연 리스트 — 모바일: 프로필 묶음 아래 17 + 위 여백 12, 섹션 사이 24(GUI `741:30919` · `741:30920`).
 * PC: 프로필 묶음 아래 48, 섹션 사이 40(`1522:35938` 간격 48 · `1495:8805` 간격 40)
 */
export const sections = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[5],
  marginTop: 17,
  paddingTop: vars.space[3],
  '@media': { [media.desktop]: { gap: 40, marginTop: vars.space[8], paddingTop: 0 } },
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

/**
 * 오른쪽 아래 [+] 56(GUI `741:30958` — 화면 끝에서 오른쪽 21 · 아래 25). PC는 그리지 않는다 — 마스터 뷰 `1495:8685`에 없다
 * (관객 뷰 `1495:9022`의 [+]는 모바일 #280처럼 잘못 들어간 것으로 본다 🤖 — Figma 코멘트)
 */
export const fab = style({
  position: 'fixed',
  right: vars.space[5],
  bottom: fabBottom,
  zIndex: vars.zIndex.header,
  textDecoration: 'none',
  '@media': { [media.desktop]: { display: 'none' } },
});
