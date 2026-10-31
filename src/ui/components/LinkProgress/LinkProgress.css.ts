import { keyframes, style, styleVariants } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';

const appear = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });

/** 항상 같은 크기로 자리를 차지한다 — 나타날 때 레이아웃이 밀리지 않게(Next 문서 useLinkStatus 권고) */
export const root = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  color: vars.color.text.tertiary,
  opacity: 0,
  pointerEvents: 'none',
  selectors: {
    // 100ms 지연 뒤 페이드 — 빠른 이동에서는 보이지 않는다
    '&[data-pending="true"]': { animation: `${appear} 150ms ease-out 100ms forwards` },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      selectors: {
        '&[data-pending="true"]': { animation: `${appear} 1ms linear 100ms forwards` },
      },
    },
  },
});

export const size = styleVariants({ sm: { width: 16, height: 16 }, md: { width: 24, height: 24 } });
