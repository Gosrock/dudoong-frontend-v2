import { style } from '@vanilla-extract/css';

import { vars } from './tokens.css';

const layer = `linear-gradient(${vars.color.overlay.cardHover}, ${vars.color.overlay.cardHover})`;

/**
 * 대시보드 카드 호버 · 눌림 — 카드 배경 위에 #000000 5%를 겹친다(GUI `1887:1876` 데스크탑 마우스 올림 · `1880:33697` 모바일 —
 * Design Sync #322 · #328, 2026-11-21). 마우스가 있는 기기는 `:hover`, 터치는 누르는 동안(`:active`)만 — 터치 뒤 호버가 남지 않게.
 * `style([cardHover, { … }])`로 합친다.
 */
export const cardHover = style({
  selectors: { '&:active': { backgroundImage: layer } },
  '@media': {
    '(hover: hover)': { selectors: { '&:hover': { backgroundImage: layer } } },
  },
});
