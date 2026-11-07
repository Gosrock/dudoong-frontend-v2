import { createVar, fallbackVar, globalStyle, style } from '@vanilla-extract/css';

import { activeMarker } from '../../hooks/activity-marker';
import { media } from '../../theme/breakpoints';
import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';
import { fabClearance } from '../Fab/Fab.css';
import { FAB_ATTR, FAB_HIDDEN_ATTR } from '../Fab/fab-attrs';

/**
 * Figma Toast popup `303:2665` — 358×54, 모서리 12(Space/3 → radius 4), 안쪽 16, 흰 배경,
 * 테두리 1px(Neutral 400 = surface.strongBorder), 그림자 drop, Body/lg 가운데 정렬. 아이콘·액션 없음.
 */
export const toast = style([
  typography.bodyLg,
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 54,
    padding: vars.space[4],
    borderRadius: vars.radius[4],
    border: `1px solid ${vars.color.surface.strongBorder}`,
    background: vars.color.background.normal,
    color: vars.color.text.primary,
    boxShadow: vars.shadow.drop,
    textAlign: 'center',
  },
]);

export const title = style({ width: '100%' });

/**
 * 토스트 자리(I-h2, GUI `958:20841` · `975:8897`). 화면 쪽이 `:root`에 값을 주면 바뀌고, 없으면 sonner 기본값 그대로.
 * - `bottom` — 화면 아래에서 토스트까지(sonner `offset`·`mobileOffset`의 bottom에 넣는다)
 * - `shiftX` — PC에서 가운데를 옮기는 양. 호스팅 공연 화면은 사이드바 268의 절반(본문 영역 가운데)
 */
export const toastPosition = {
  bottom: createVar(),
  mobileBottom: createVar(),
  shiftX: createVar(),
};

/** sonner 기본(PC 24 · 600 이하 16)을 대체값으로 */
export const toastOffset = { bottom: fallbackVar(toastPosition.bottom, '24px') };
export const toastMobileOffset = { bottom: fallbackVar(toastPosition.mobileBottom, '16px') };

/**
 * 모바일(~1023)에 FAB가 떠 있으면 토스트를 FAB 위 16으로(GUI `958:20841` — FAB 위 16).
 * 숨은 Activity 화면의 FAB와 숨겨 둔 FAB(`data-fab-hidden` — 맨 위로 버튼이 스크롤 전)는 빼고 본다(patterns §6).
 * PC는 FAB가 오른쪽 끝이라 겹치지 않는다(GUI `975:8897` — 토스트가 FAB 위로 올라가지 않음).
 */
globalStyle(`:root:has(${activeMarker(FAB_ATTR)}:not([${FAB_HIDDEN_ATTR}]))`, {
  '@media': {
    'screen and (max-width: 1023.98px)': {
      vars: {
        [toastPosition.bottom]: fabClearance.lg,
        [toastPosition.mobileBottom]: fabClearance.lg,
      },
    },
  },
});

/**
 * PC 가운데 정렬 — sonner는 `left: 50%; translateX(-50%)`. `shiftX`만큼 옮긴다(기본 0 — 관객 · 사이드바 없는 화면은 그대로).
 * sonner 규칙(속성 선택자 2개)보다 구체적이게 `:root`를 붙인다.
 */
globalStyle(':root [data-sonner-toaster][data-x-position="center"]', {
  '@media': {
    [media.desktop]: { left: `calc(50% + ${fallbackVar(toastPosition.shiftX, '0px')})` },
  },
});
