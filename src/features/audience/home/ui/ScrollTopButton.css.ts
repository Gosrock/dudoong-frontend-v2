import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 맨 위로(GUI `759:12102` — DS Button round Primary를 40으로, 화면 오른쪽 아래 24 · PC 와이어 `626:19888`은 본문 1200 오른쪽 끝).
 * 스크롤 전에는 숨긴다(`data-visible`이 없을 때 — 이슈 #92-8). `visibility`라 포커스·스크린리더에서도 빠진다.
 */
export const root = style({
  position: 'fixed',
  right: vars.space[5],
  bottom: `calc(${vars.space[5]} + env(safe-area-inset-bottom))`,
  zIndex: 10,
  width: 40,
  height: 40,
  opacity: 0,
  visibility: 'hidden',
  transition: 'opacity 0.2s, visibility 0.2s',
  selectors: {
    '&[data-visible]': { opacity: 1, visibility: 'visible' },
  },
  '@media': {
    [media.desktop]: { right: `max(${vars.space[5]}, calc((100vw - 1200px) / 2))` },
    '(prefers-reduced-motion: reduce)': { transition: 'none' },
  },
});
