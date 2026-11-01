import { globalStyle, style } from '@vanilla-extract/css';

import { activeMarker } from '@/features/shared/shell/activity-marker';
import { stickyBar } from '@/features/shared/shell/shell.css';
import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 페이지가 두는 하위 화면 헤더 표시. 있으면 셸 로고 헤더가 숨는다. 표시를 다는 쪽은 `useActivityMarker` ref도 건다 —
 * 숨은 Activity(이동 전 화면)의 표시는 판정에서 빠진다(fix-qa-1101, patterns §6)
 */
export const SUBHEADER_ATTR = 'data-shell-subheader';

/**
 * 화면 높이를 채우는 세로 flex. 본문(`body`)이 남은 높이를 `flex`로 채운다 — `calc(100dvh - 바 높이)`처럼 빼지 않는다
 * (위 서비스 배너 높이까지 빼야 해서, 빼면 배너가 있을 때 48px 넘친다 — fix-qa-1101)
 */
export const root = style({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100dvh',
  background: vars.color.background.normal,
});

export const mobileHeader = style([
  stickyBar,
  { '@media': { [media.desktop]: { display: 'none' } } },
]);

globalStyle(`${root}:has(${activeMarker(SUBHEADER_ATTR)}) ${mobileHeader}`, { display: 'none' });

/** PC 상단 바 — 화면 위에 고정(`stickyBar`) */
export const desktopOnly = style([
  stickyBar,
  { display: 'none', '@media': { [media.desktop]: { display: 'flex' } } },
]);

/** 하위 화면 헤더(`AudienceSubHeader`) 자리 — 모바일만, 로고 헤더처럼 위에 고정 */
export const subHeader = style([stickyBar, { '@media': { [media.desktop]: { display: 'none' } } }]);

export const body = style({ flex: '1 0 auto', display: 'flex', flexDirection: 'column' });

/** 세션 확인 중 PC 오른쪽 자리 — 아바타 ▾ 버튼 높이 */
export const accountPending = style({ display: 'inline-block', width: 96, height: 40 });

/**
 * 페이지가 두는 "검색 아이콘 숨김" 표시. 공연 리스트(`/events`)는 화면 안에 검색칸이 있어 헤더 검색 아이콘을 뺀다
 * (GUI `759:7895` Title `basic title (no search)`, PC 와이어 `640:1032`). 경로를 읽지 않고 CSS `:has`로(위 SUBHEADER_ATTR와 같은 방식 — `useActivityMarker` ref 포함).
 */
export const NO_SEARCH_ATTR = 'data-shell-no-search';

globalStyle(
  `${root}:has(${activeMarker(NO_SEARCH_ATTR)}) a[href="/events"][aria-label="공연 검색"]`,
  {
    display: 'none',
  },
);
