import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 맨 위로(GUI `759:12102` · 공연홈 `1383:7765` — DS Button round Primary를 40으로, 화면 오른쪽 아래 24 · PC는 본문 오른쪽 끝).
 * 두 인스턴스 모두 이펙트 스타일 `drop shadow`(y 4 · blur 4 · 검정 10%)를 덧씌웠다 — Figma대로(Design Sync #205).
 * 스크롤 전에는 숨긴다(`data-visible`이 없을 때 — 이슈 #92-8). `visibility`라 포커스·스크린리더에서도 빠진다.
 */
export const root = style({
  position: 'fixed',
  right: vars.space[5],
  bottom: `calc(${vars.space[5]} + env(safe-area-inset-bottom))`,
  zIndex: 10,
  width: 40,
  height: 40,
  // FIGMA-CUSTOM: DS round Primary에 없는 그림자(gui 1383:7765 · 759:12102 effects override) → 화면대로. 2단계 후보
  boxShadow: vars.shadow.drop,
  opacity: 0,
  visibility: 'hidden',
  transition: 'opacity 0.2s, visibility 0.2s',
  selectors: {
    '&[data-visible]': { opacity: 1, visibility: 'visible' },
  },
  '@media': {
    // PC — 본문(최대 1280) 오른쪽 끝에 맞춘다: 1024에서 40 · 1440에서 80(GUI `1979:2281` · `1970:2153` · `1989:28156`, 2026-11-22)
    [media.desktop]: { right: `max(${vars.space[7]}, calc((100vw - 1280px) / 2))` },
    '(prefers-reduced-motion: reduce)': { transition: 'none' },
  },
});
