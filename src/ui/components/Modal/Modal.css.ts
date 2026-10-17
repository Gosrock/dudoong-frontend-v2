import { globalStyle, keyframes, style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';

const fadeIn = keyframes({ from: { opacity: 0 } });
const fadeOut = keyframes({ to: { opacity: 0 } });
const popIn = keyframes({ from: { opacity: 0, transform: 'translate(-50%, -48%) scale(0.97)' } });
const popOut = keyframes({ to: { opacity: 0, transform: 'translate(-50%, -48%) scale(0.97)' } });

const reduced = '(prefers-reduced-motion: reduce)';

/**
 * 딤. GUI 확인 모달(`567:9468`)은 검정 80%, 티켓 시트(`331:5853`)는 Neutral 900 70%로 서로 다르다 — 70%로 통일.
 * 색 토큰 `background.dark`를 섞어 쓴다(다크 테마에서는 흰색이 되므로 다크 출시 전에 딤 전용 토큰이 필요하다).
 */
export const overlay = style({
  position: 'fixed',
  inset: 0,
  zIndex: vars.zIndex.modal,
  background: vars.color.overlay.dim,
  selectors: {
    '&[data-state="open"]': { animation: `${fadeIn} 200ms ease-out` },
    '&[data-state="closed"]': { animation: `${fadeOut} 150ms ease-in` },
  },
  '@media': { [reduced]: { animation: 'none !important' } },
});

/** GUI `567:9468` — 342폭(좌우 24), 모서리 16, 안쪽 16, 간격 8, 배경 surface.container */
export const content = style({
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: vars.zIndex.modal,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  width: `calc(100% - ${vars.space[5]} * 2)`,
  maxWidth: 480,
  maxHeight: `calc(100dvh - ${vars.space[5]} * 2)`,
  padding: vars.space[4],
  borderRadius: vars.radius[5],
  background: vars.color.surface.container,
  color: vars.color.text.primary,
  outline: 'none',
  selectors: {
    '&[data-state="open"]': { animation: `${popIn} 200ms ease-out` },
    '&[data-state="closed"]': { animation: `${popOut} 150ms ease-in` },
  },
  '@media': { [reduced]: { animation: 'none !important' } },
});

/** 확인 팝업은 GUI 폭(342) 그대로 */
export const contentCompact = style({ maxWidth: 342 });

export const header = style({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: vars.space[2],
});

export const title = style({ margin: 0, flex: 1, minWidth: 0 });

export const description = style({ margin: 0, whiteSpace: 'pre-line' });

export const body = style({
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflowY: 'auto',
  // GUI: 설명과 본문 사이는 간격 8 + 본문 카드 사이 16
  marginTop: vars.space[2],
});

export const footer = style({
  display: 'flex',
  gap: vars.space[2],
  marginTop: vars.space[2],
});

/** 버튼은 같은 폭으로 나뉜다 */
globalStyle(`${footer} > *`, { flex: 1 });

export const closeButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 24,
  height: 24,
  padding: 0,
  border: 0,
  background: 'transparent',
  color: vars.color.text.primary,
  cursor: 'pointer',
  borderRadius: vars.radius[1],
});

export const headerEnd = style({ display: 'flex', justifyContent: 'flex-end' });
