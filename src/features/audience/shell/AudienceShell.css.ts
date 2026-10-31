import { globalStyle, style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/** 페이지가 두는 하위 화면 헤더 표시. 있으면 셸 로고 헤더가 숨는다 */
export const SUBHEADER_ATTR = 'data-shell-subheader';

export const root = style({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100dvh',
  background: vars.color.background.normal,
});

export const mobileHeader = style({
  '@media': { [media.desktop]: { display: 'none' } },
});

globalStyle(`${root}:has([${SUBHEADER_ATTR}]) ${mobileHeader}`, { display: 'none' });

export const desktopOnly = style({
  display: 'none',
  '@media': { [media.desktop]: { display: 'flex' } },
});

export const mobileOnly = style({
  '@media': { [media.desktop]: { display: 'none' } },
});

export const body = style({ flex: '1 0 auto', display: 'flex', flexDirection: 'column' });

/** 세션 확인 중 PC 오른쪽 자리 — 아바타 ▾ 버튼 높이 */
export const accountPending = style({ display: 'inline-block', width: 96, height: 40 });

/**
 * 페이지가 두는 "검색 아이콘 숨김" 표시. 공연 리스트(`/events`)는 화면 안에 검색칸이 있어 헤더 검색 아이콘을 뺀다
 * (GUI `759:7895` Title `basic title (no search)`, PC 와이어 `640:1032`). 경로를 읽지 않고 CSS `:has`로(위 SUBHEADER_ATTR와 같은 방식).
 */
export const NO_SEARCH_ATTR = 'data-shell-no-search';

globalStyle(`${root}:has([${NO_SEARCH_ATTR}]) a[href="/events"][aria-label="공연 검색"]`, {
  display: 'none',
});
