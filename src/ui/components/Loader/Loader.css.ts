import { keyframes, style, styleVariants } from '@vanilla-extract/css';

import { FULL_SCREEN_MIN_HEIGHT } from '../../theme/bars';
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

/**
 * sm 16 — Button sm·md 라벨(12·14px) 자리, base 20 — 디자인 시스템 `Spinner`(`772:1176`, 2026-10-31T17:25Z: 20 틀 · 원 16 · 선 2.5 —
 * 24 viewBox 원 r9·선 3을 20으로 줄이면 원 15 · 선 2.5), md 24 — Button lg·화면 로딩
 */
export const spinnerSize = styleVariants({
  sm: { width: 16, height: 16 },
  base: { width: 20, height: 20 },
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

/** 화면 높이 채우기 — 셸 안이면 고정 바 자리를 뺀다(이슈 #95, `bars.ts`) */
export const screenFull = style({ minHeight: FULL_SCREEN_MIN_HEIGHT });

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
