import { globalStyle } from '@vanilla-extract/css';

import { HEADER_HEIGHT, TOP_BAR_HEIGHT } from './bars';
import { media } from './breakpoints';
import { vars } from './tokens.css';

globalStyle('*, *::before, *::after', { boxSizing: 'border-box' });
globalStyle('html, body', { margin: 0, padding: 0 });
/** 상단 바가 고정이라(fix-qa-1101) 포커스 이동·앵커 스크롤이 바 아래로 오게 한다(가려지지 않게 — WCAG 2.4.11) */
globalStyle('html', {
  scrollPaddingTop: HEADER_HEIGHT,
  '@media': { [media.desktop]: { scrollPaddingTop: TOP_BAR_HEIGHT } },
});
globalStyle('body', {
  fontFamily: vars.font.body,
  color: vars.color.text.primary,
  background: vars.color.background.normal,
  WebkitFontSmoothing: 'antialiased',
  wordBreak: 'keep-all',
  overflowWrap: 'anywhere',
});
globalStyle('h1, h2, h3, h4, h5, h6, p', { margin: 0 });
globalStyle('button', { font: 'inherit', color: 'inherit' });
globalStyle('a', { color: 'inherit', textDecoration: 'none' });
globalStyle('img, svg', { display: 'block', maxWidth: '100%' });
/**
 * 축소 모션(P14 접근성): 전환(transition — 토글 손잡이 · 아코디언 화살표 · 진행 막대 등)을 끈다.
 * 애니메이션(keyframes)은 컴포넌트가 각자 정한다 — 오버레이는 즉시, 로더는 느리게 돌고(멈추면 로딩이 안 보인다) 스켈레톤은 멈춘다.
 */
globalStyle('*, *::before, *::after', {
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transitionDuration: '0.01ms !important',
      transitionDelay: '0s !important',
    },
  },
});
globalStyle(':focus-visible', {
  outline: `2px solid ${vars.color.brand.primary}`,
  outlineOffset: 2,
});
