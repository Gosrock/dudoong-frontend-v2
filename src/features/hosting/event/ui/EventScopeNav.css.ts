import { globalStyle, style } from '@vanilla-extract/css';

import {
  EVENT_SCOPE_ATTR,
  HIDE_EVENT_HEADER_ATTR,
} from '@/features/hosting/shared/ui/event-scope-attrs';
import { fixedBar } from '@/features/shared/shell/shell.css';
import { TOP_BAR_HEIGHT } from '@/ui/theme/bars';
import { media } from '@/ui/theme/breakpoints';
import { sprinkles } from '@/ui/theme/sprinkles.css';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 공연 사이드바(GUI `712:1646` 안 `Sidebar` 268×966 — Design Sync #327 · #335, 2026-11-21) — 검정 면(`background.dark`),
 * 위 24 · 좌우 16, 묶음 사이 32(공연 정보 → 메뉴 → 공연 페이지 보기). 맨 아래 "공연 페이지 보기"는 바닥에 붙는다. PC에서만 보인다(1024~).
 */
export const sidebar = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[6],
  height: '100%',
  minHeight: '100%',
  padding: `${vars.space[5]} ${vars.space[4]} 0`,
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

/**
 * 공연 정보(GUI `사이드바_공연 정보` `1861:2065` 236×72) — 좌우 12, 간격 8: "← 내 공연"(`ic_backward` 16 + 간격 4, `Label/md`
 * `text/tertiary-label`) → 공연명 `Heading/md2 - emphasized` 흰 글자 + 간격 4 + "호스트 · D-n" `Body/md` 회색
 */
export const info = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  padding: `0 ${vars.space[3]}`,
});

export const back = style({
  display: 'flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: vars.space[1],
  color: vars.color.text.tertiaryLabel,
  textDecoration: 'none',
  borderRadius: vars.radius[2],
  selectors: {
    '&:hover': { color: vars.color.text.inverse },
  },
});
globalStyle(`${back} > svg`, { width: 16, height: 16, flexShrink: 0 });

export const menu = style([
  sprinkles({ listStyle: 'none' }),
  {
    display: 'flex',
    flexDirection: 'column',
    gap: vars.space[1],
    margin: 0,
    padding: 0,
  },
]);

/** 메뉴 묶음(GUI `Frame 1707480324`) */
export const cardAndMenu = style({ display: 'flex', flexDirection: 'column', gap: vars.space[4] });

/** "공연 페이지 보기"(GUI `712:1646` 268×67 — 패딩 24, 아이콘 16 + 간격 12, `Label/lg` `text/tertiary-label`) */
export const publicLink = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  marginTop: 'auto',
  // 사이드바 좌우 16 + 8 = Figma 24(2026-11-21 — 전에는 28)
  padding: `${vars.space[5]} ${vars.space[2]}`,
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
  fixedBar,
  { '@media': { [media.desktop]: { display: 'none' } } },
]);

/** 공연 헤더 숨김(`HIDE_EVENT_HEADER_ATTR`) — 티켓 폼(모바일)이 ← 제목 헤더를 쓰는 동안 */
globalStyle(`[${EVENT_SCOPE_ATTR}][${HIDE_EVENT_HEADER_ATTR}] .${mobileHeader}`, {
  display: 'none',
});

/** 드로어 안 사이드바 — 드로어 머리 줄 아래를 채운다 */
export const drawerSidebar = style({ minHeight: '100%', borderRadius: vars.radius[4] });

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
