import { globalStyle, style } from '@vanilla-extract/css';

import { container } from '@/ui/primitives/layout.css';
import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/** 공연 스코프 표시 — `EventScopeView`가 단다. 있으면 본문의 폭 제한·여백을 푼다(3단은 화면 끝까지) */
export const EVENT_SCOPE_ATTR = 'data-event-scope';

export const root = style({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100dvh',
  background: vars.color.background.normal,
});

export const mobileHeader = style({
  '@media': { [media.desktop]: { display: 'none' } },
});

/** 공연 안에서는 로고 헤더 대신 공연 헤더("대시보드 ▾ / 공연명" + 벨 — P11-V `EventMobileHeader`)가 나온다. 같은 DOM, CSS `:has`로 */
globalStyle(`${root}:has([${EVENT_SCOPE_ATTR}]) ${mobileHeader}`, { display: 'none' });

export const desktopOnly = style({
  display: 'none',
  '@media': { [media.desktop]: { display: 'flex' } },
});

/** 공연 밖 화면 — 최대 1280, 좌우 24 · 40 · 80(GUI 공연준비 홈 PC `741:30197`·`741:30179`·`741:30215`의 그리드와 같다) */
export const body = style([
  container,
  { flex: '1 0 auto', display: 'flex', flexDirection: 'column' },
]);

globalStyle(`${root}:has([${EVENT_SCOPE_ATTR}]) ${body}`, {
  maxWidth: 'none',
  paddingLeft: 0,
  paddingRight: 0,
});

export const accountPending = style({ display: 'inline-block', width: 96, height: 40 });
