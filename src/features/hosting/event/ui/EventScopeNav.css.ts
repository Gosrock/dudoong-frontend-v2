import { globalStyle, style } from '@vanilla-extract/css';

import { stickyBar } from '@/features/shared/shell/shell.css';
import { sidebarTint } from '@/ui/components/SidebarMenu/SidebarMenu';
import { TOP_BAR_HEIGHT } from '@/ui/theme/bars';
import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 공연 사이드바(GUI Ready `727:23210`·`748:34006`·`767:39645` 안 `Frame 1707480221` 268×966) — 검정 면(`background.dark`),
 * 위 16 · 좌우 16, 항목 사이 12. 맨 아래 "공연 페이지 보기"는 바닥에 붙는다. PC에서만 보인다(1024~).
 */
export const sidebar = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  height: '100%',
  minHeight: '100%',
  padding: `${vars.space[4]} ${vars.space[4]} 0`,
  boxSizing: 'border-box',
  background: vars.color.background.dark,
  color: vars.color.text.inverse,
});

/**
 * PC 사이드바 — 고정 상단 바 바로 아래에 붙고(sticky, fix-qa-1101), 칸(3단 왼쪽 열) 높이를 채우되 화면 높이 − 상단 바를 넘지 않는다.
 * 넘치면 자체 스크롤. 높이를 `calc(100dvh - 58px)`로 못박지 않는다 — 배너가 있으면 내용 짧은 화면이 그만큼 넘쳤다
 */
export const desktopSidebar = style({
  display: 'none',
  '@media': {
    [media.desktop]: {
      display: 'flex',
      position: 'sticky',
      top: TOP_BAR_HEIGHT,
      height: '100%',
      // 위 `sidebar`의 minHeight 100%(드로어용)가 maxHeight를 이기므로 푼다
      minHeight: 0,
      maxHeight: `calc(100dvh - ${TOP_BAR_HEIGHT}px)`,
      overflowY: 'auto',
    },
  },
});

/** "‹ 내 공연"(GUI `727:23216` 44h, 위아래 12, 아이콘 20 + 간격 4, `Label/lg` `text/tertiary-label`) */
export const back = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[1],
  padding: `${vars.space[3]} 0`,
  color: vars.color.text.tertiaryLabel,
  textDecoration: 'none',
  borderRadius: vars.radius[2],
  selectors: {
    '&:hover': { color: vars.color.text.inverse },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});
globalStyle(`${back} > svg`, { width: 20, height: 20, flexShrink: 0 });

/** 공연 카드(GUI `Card list` `727:23220` 236×92 — 패딩 12, 모서리 16, 배경 #F7F7F6 10%) */
export const card = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  padding: vars.space[3],
  borderRadius: vars.radius[5],
  background: sidebarTint,
});

/** 포스터 48×68 모서리 8(`example poster` mobile을 줄인 것 — `img_포스터 준비중` 48×68 r8) */
export const poster = style({
  flexShrink: 0,
  width: 48,
  height: 68,
  borderRadius: vars.radius[2],
  objectFit: 'cover',
  background: vars.color.surface.imageBg,
});

export const menu = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

/** 카드 → 메뉴 간격 16(GUI `Frame 1707480324` gap 16) */
export const cardAndMenu = style({ display: 'flex', flexDirection: 'column', gap: vars.space[4] });

/** "공연 페이지 보기"(GUI `748:34032` 268×67 — 위아래 24 · 좌우 28, 아이콘 16 + 간격 12, `Label/lg` `text/tertiary-label`) */
export const publicLink = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  marginTop: 'auto',
  // 사이드바 좌우 16 + 12 = Figma 28
  padding: `${vars.space[5]} ${vars.space[3]}`,
  color: vars.color.text.tertiaryLabel,
  textDecoration: 'none',
  selectors: {
    '&:hover': { color: vars.color.text.inverse },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: -2 },
  },
});
globalStyle(`${publicLink} > svg`, { width: 16, height: 16, flexShrink: 0 });

/** 모바일 헤더(1024 미만만) — 공연 안에서는 셸의 로고 헤더 대신 이것("대시보드 ▾ / 공연명" + 벨, GUI `727:23088`) */
export const mobileHeader = style([
  stickyBar,
  { '@media': { [media.desktop]: { display: 'none' } } },
]);

/** 드로어 안 사이드바 — 드로어 머리 줄 아래를 채운다 */
export const drawerSidebar = style({ minHeight: '100%', borderRadius: vars.radius[4] });

/** 공연 전환 시트의 줄 */
export const switchRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  width: '100%',
  padding: `${vars.space[3]} 0`,
  color: vars.color.text.primaryLabel,
  textDecoration: 'none',
  borderRadius: vars.radius[2],
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

/** 읽기 전용 안내 줄(디자인 없음 — 본문 위, 회색 상자) */
export const readOnly = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
  margin: `${vars.space[4]} ${vars.space[5]} 0`,
  padding: `${vars.space[3]} ${vars.space[4]}`,
  borderRadius: vars.radius[4],
  background: vars.color.surface.container,
  color: vars.color.text.secondaryLabel,
});
globalStyle(`${readOnly} > svg`, { width: 20, height: 20, flexShrink: 0 });
