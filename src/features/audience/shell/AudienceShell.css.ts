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
