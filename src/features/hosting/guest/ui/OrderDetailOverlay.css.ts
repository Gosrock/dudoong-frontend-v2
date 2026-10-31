import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

export const body = style({ display: 'flex', flexDirection: 'column', gap: vars.space[4] });

export const section = style({ display: 'flex', flexDirection: 'column', gap: vars.space[2] });

export const lines = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

export const line = style({ display: 'flex', flexDirection: 'column', gap: vars.space[2] });

export const answers = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  margin: 0,
  padding: vars.space[3],
  borderRadius: vars.radius[4],
  background: vars.color.surface.container,
});

export const answer = style({ display: 'flex', flexDirection: 'column', gap: vars.space[1] });

export const alert = style({ margin: 0 });

/** 하단 버튼 — 같은 폭 두 개(와이어 [취소][거절하기]) */
export const footer = style({ display: 'flex', gap: vars.space[2], width: '100%' });

/** DS InfoRow(third)는 화면 폭 행(좌우 24)이라 오버레이 안에서는 좌우를 비운다 */
export const infoRow = style({ minHeight: 0, paddingInline: 0, paddingBlock: vars.space[2] });

/** 거절 사유 라디오 — 와이어 `108:4850`처럼 세로 한 줄씩 */
export const reasons = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: vars.space[4],
});
