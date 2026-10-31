import { keyframes, style, styleVariants } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';

const spin = keyframes({ to: { transform: 'rotate(360deg)' } });

export const spinner = style({
  display: 'inline-block',
  flexShrink: 0,
  color: 'currentColor',
  animation: `${spin} 0.8s linear infinite`,
  '@media': {
    // 움직임을 줄여도 진행 중임은 보여야 하므로 멈추지 않고 느리게 돈다
    '(prefers-reduced-motion: reduce)': { animationDuration: '2.4s' },
  },
});

/** sm 16 — Button sm·md 라벨(12·14px) 자리, md 24 — Button lg·화면 로딩 */
export const spinnerSize = styleVariants({
  sm: { width: 16, height: 16 },
  md: { width: 24, height: 24 },
});

export const track = style({ opacity: 0.25 });

export const screen = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  minHeight: 240,
  padding: vars.space[6],
  color: vars.color.text.tertiary,
});

export const screenFull = style({ minHeight: '100dvh' });

/** 라벨 폭을 유지한 채 스피너로 바꾼다(design-system §3 "없는 상태" — Button 로딩) */
export const loadingLabel = style({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'inherit',
});

// visibility: hidden은 접근성 이름까지 지우므로 opacity로 숨긴다
export const hiddenLabel = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'inherit',
  opacity: 0,
});

export const overlaySpinner = style({ position: 'absolute', inset: 0, margin: 'auto' });
