import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 맨 위로(GUI `759:12102` — DS Button round Primary를 40으로, 화면 오른쪽 아래 24 · PC 와이어 `626:19888`은 본문 1200 오른쪽 끝).
 */
export const root = style({
  position: 'fixed',
  right: vars.space[5],
  bottom: `calc(${vars.space[5]} + env(safe-area-inset-bottom))`,
  zIndex: 10,
  width: 40,
  height: 40,
  '@media': {
    [media.desktop]: { right: `max(${vars.space[5]}, calc((100vw - 1200px) / 2))` },
  },
});
