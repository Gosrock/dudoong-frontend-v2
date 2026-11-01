import { globalStyle, style } from '@vanilla-extract/css';

import { activeMarker } from '@/features/shared/shell/activity-marker';
import { stickyBar } from '@/features/shared/shell/shell.css';
import { container } from '@/ui/primitives/layout.css';
import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 공연 스코프 표시 — `EventScopeFrame`이 단다. 있으면 본문의 폭 제한·여백을 푼다(3단은 화면 끝까지).
 * 판정은 `activeMarker`로 — 숨은 Activity(이동 전 공연 화면)의 표시는 빼고 본다(fix-qa-1101, patterns §6)
 */
export const EVENT_SCOPE_ATTR = 'data-event-scope';

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

/** 공연 안에서는 로고 헤더 대신 공연 헤더("대시보드 ▾ / 공연명" + 벨 — P11-V `EventMobileHeader`)가 나온다. 같은 DOM, CSS `:has`로 */
globalStyle(`${root}:has(${activeMarker(EVENT_SCOPE_ATTR)}) ${mobileHeader}`, { display: 'none' });

/** PC 상단 바 — 화면 위에 고정(`stickyBar`) */
export const desktopOnly = style([
  stickyBar,
  { display: 'none', '@media': { [media.desktop]: { display: 'flex' } } },
]);

/** 공연 밖 화면 — 최대 1280, 좌우 24 · 40 · 80(GUI 공연준비 홈 PC `741:30197`·`741:30179`·`741:30215`의 그리드와 같다) */
export const body = style([
  container,
  { flex: '1 0 auto', display: 'flex', flexDirection: 'column' },
]);

globalStyle(`${root}:has(${activeMarker(EVENT_SCOPE_ATTR)}) ${body}`, {
  maxWidth: 'none',
  paddingLeft: 0,
  paddingRight: 0,
});

export const accountPending = style({ display: 'inline-block', width: 96, height: 40 });
