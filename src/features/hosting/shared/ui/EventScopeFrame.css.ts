import { globalStyle, style } from '@vanilla-extract/css';

import { toastPosition } from '@/ui/components/Toast/Toast.css';
import { activeMarker } from '@/ui/hooks/activity-marker';
import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

import { EVENT_SCOPE_ATTR } from './event-scope-attrs';

/** PC 사이드바 폭 — GUI `712:1646` 등 */
const SIDEBAR_WIDTH = 268;

/**
 * 공연 스코프 3단(GUI Ready `712:1646`·`669:2972`·`680:672`, gui-screens §3). 상단 바 58 아래에
 * 사이드바 268 고정 + 가운데 fill. 1024~1279도 같은 3단이다(우측 패널을 내리지 않는다). 모바일은 위아래로 쌓는다.
 * 높이는 셸 본문(세로 flex)의 남은 높이를 `flex`로 채운다 — `calc(100dvh - 58px)`는 배너 높이만큼 넘쳤다(fix-qa-1101).
 */
export const frame = style({
  flex: '1 0 auto',
  display: 'flex',
  flexDirection: 'column',
  '@media': {
    [media.desktop]: {
      display: 'grid',
      gridTemplateColumns: `${SIDEBAR_WIDTH}px minmax(0, 1fr)`,
    },
  },
});

/**
 * 토스트 자리(I-h2) — PC는 본문 영역(사이드바 뺀 곳) 가운데, 아래 48(GUI `975:8897` · `1029:5720` 토스트 가운데 x 854 = 268 + 1172/2,
 * 화면 아래에서 48 = PC `space[7]`). 숨은 Activity 틀은 빼고 본다. 모바일은 사이드바가 없어 그대로(FAB 위로 올리는 것은 DS Toast).
 */
globalStyle(`:root:has(${activeMarker(EVENT_SCOPE_ATTR)})`, {
  '@media': {
    [media.desktop]: {
      vars: {
        [toastPosition.shiftX]: `${SIDEBAR_WIDTH / 2}px`,
        [toastPosition.bottom]: vars.space[7],
      },
    },
  },
});

/** 사이드바 자리(268). 사이드바 본문 — 검정 면·공연 카드·메뉴 — 은 P11-V(`사이드바 메뉴`)가 채운다 */
export const sidebar = style({ minWidth: 0 });

export const center = style({ minWidth: 0, display: 'flex', flexDirection: 'column' });

/** 가운데의 페이지 본문(`<main>`)이 남은 높이를 채운다 — 우측 패널 선이 화면 끝까지(GUI `727:17829`) */
globalStyle(`${center} > main`, { flex: '1 0 auto', display: 'flex', flexDirection: 'column' });

/**
 * 가운데 + 우측 일정 패널(등록 후 대시보드만). 패널 폭은 구간마다 고정 — 286(1024~) · 335(1280~) · 388(1440~),
 * 왼쪽 선 1px(GUI `727:17829` 테두리 #F7F7F6 = `surface.container`). 모바일에는 패널이 없다(GUI 모바일 `669:2787`).
 */
export const withPanel = style({
  flex: '1 0 auto',
  display: 'flex',
  flexDirection: 'column',
  '@media': {
    [media.desktop]: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 286px' },
    [media.desktopS]: { gridTemplateColumns: 'minmax(0, 1fr) 335px' },
    [media.desktopL]: { gridTemplateColumns: 'minmax(0, 1fr) 388px' },
  },
});

export const panel = style({
  display: 'none',
  '@media': {
    [media.desktop]: {
      display: 'block',
      minWidth: 0,
      borderLeft: `1px solid ${vars.color.surface.container}`,
    },
  },
});
