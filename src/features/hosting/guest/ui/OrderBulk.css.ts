import { globalStyle, style } from '@vanilla-extract/css';

import { toastPosition } from '@/ui/components/Toast/Toast.css';
import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 일괄 처리 바 — 모바일(`989:910`): 화면 아래 고정, 흰 바탕 + 위 선, 좌우 24 · 위 12 · 아래 34(홈 표시줄 — safe-area로).
 * PC(`1029:5714`): 본문 가운데 아래 떠 있는 640×62 상자, `surface/container` 바탕 · 모서리 8 · 좌우 16, 화면 아래 48
 * (`1029:5714` · `1268:11406` 아래 간격 48 = PC `space[7]`).
 */
export const bar = style({
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: vars.zIndex.header,
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
  padding: `${vars.space[3]} ${vars.space[5]} calc(${vars.space[3]} + env(safe-area-inset-bottom))`,
  borderTop: `1px solid ${vars.color.surface.defaultBorder}`,
  background: vars.color.background.normal,
  '@media': {
    [media.desktop]: {
      left: '50%',
      right: 'auto',
      bottom: vars.space[7],
      width: 640,
      // 사이드바(268)를 뺀 본문 가운데 — GUI `1029:5714`(x 534~1174 = 본문 268~1440의 가운데)
      transform: `translateX(calc(-50% + 134px))`,
      padding: `${vars.space[2]} ${vars.space[2]} ${vars.space[2]} ${vars.space[4]}`,
      border: 'none',
      borderRadius: vars.radius[2],
      background: vars.color.surface.container,
      boxShadow: vars.shadow.drop2,
    },
  },
});

export const count = style({ flex: '1 1 auto', minWidth: 0 });

/** PC 바 높이 — 위아래 8 + 버튼 46(GUI `1268:11406` 62) */
const BAR_HEIGHT_PC = '62px';

/**
 * 선택 바가 떠 있으면 PC 토스트를 바 위 8로(GUI `1268:11182` · `1268:11544` — 토스트 아래 118 = 바 48 + 62 + 8, #175).
 * 모바일은 GUI도 토스트가 바 위에 겹쳐 떠서(`1268:11906` 아래 50) 그대로 둔다.
 * 호스팅 공연 화면 토스트 자리(`EventScopeFrame.css.ts` — `:root:has([…]:not([…]))`, 0,3,0)보다 구체적이게 `:root`를 겹쳐 쓴다
 */
globalStyle(`:root:root:root:has(${bar})`, {
  '@media': {
    [media.desktop]: {
      vars: {
        [toastPosition.bottom]: `calc(${vars.space[7]} + ${BAR_HEIGHT_PC} + ${vars.space[2]})`,
      },
    },
  },
});
