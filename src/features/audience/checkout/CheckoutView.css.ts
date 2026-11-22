import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 체크아웃 — 모바일 390(GUI `567:9159` 등) 한 열, PC(1024~)는 본문 1280 · 좌우 최소 80 · 위 40 · 아래 80에 두 열
 * (GUI `[WEB] 공연결제` `1999:2891` — Design Sync #363. 열은 `CheckoutForm` PC 트리).
 */
export const CHECKOUT_MAX_WIDTH = 1280;

export const page = style({
  flex: '1 0 auto',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  '@media': {
    [media.desktop]: {
      maxWidth: `calc(${CHECKOUT_MAX_WIDTH}px + ${vars.space[9]} * 2)`,
      margin: '0 auto',
      // 위 40(space[7]은 PC 48이라 32 + 8) · 좌우 · 아래 80(space[9]는 PC 80)
      padding: `calc(${vars.space[6]} + ${vars.space[2]}) ${vars.space[9]} ${vars.space[9]}`,
    },
  },
});

/** 화면 제목(h1) "주문/결제" — 모바일은 하위 헤더가, PC는 그림에 제목이 없어(`1999:2832`) 글자를 숨긴다(읽기 전용) */
export const title = style({
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
});
