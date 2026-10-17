import { createVar, keyframes, style, styleVariants } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';

export const widthVar = createVar();
export const heightVar = createVar();

const shimmer = keyframes({
  from: { backgroundPosition: '100% 0' },
  to: { backgroundPosition: '-100% 0' },
});

/** 반짝임: 회색 바탕 위로 밝은 띠가 지나간다. 움직임 줄이기 설정이면 멈춘 회색 */
export const base = style({
  display: 'block',
  flexShrink: 0,
  width: widthVar,
  height: heightVar,
  backgroundColor: vars.color.background.grey,
  backgroundImage: `linear-gradient(90deg, transparent 0%, ${vars.color.surface.container} 50%, transparent 100%)`,
  backgroundSize: '200% 100%',
  backgroundRepeat: 'no-repeat',
  animation: `${shimmer} 1.4s ease-in-out infinite`,
  '@media': {
    '(prefers-reduced-motion: reduce)': { animation: 'none', backgroundImage: 'none' },
  },
});

export const shape = styleVariants({
  block: { borderRadius: vars.radius[2] },
  text: { borderRadius: vars.radius[1] },
  circle: { borderRadius: vars.radius.full },
});

export const lines = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  width: widthVar,
});
