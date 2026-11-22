import { style, styleVariants } from '@vanilla-extract/css';

import { sprinkles } from '../../theme/sprinkles.css';
import { vars } from '../../theme/tokens.css';

/**
 * GUI `일정 패널_v2`(`1868:2240`, Design Sync #335 — 2026-11-21). 패딩 24 · 간격 24(머리 → 타임라인).
 * 머리: "공연 일정" `Heading/sm - emphasized` + 간격 4 + "오늘 · M월 D일" `Body/sm` 회색.
 * 타임라인: 단계 사이 8. 단계 = 레일 20(점 + 간격 4 + 선 2, 가운데) + 간격 12 + 글자(제목 `Label/md - emphasized` · 간격 4 · 날짜 `Label/sm`).
 * 지금 · 취소 단계는 간격 4 + 회색 상자(#F7F7F6 · 모서리 12 · 패딩 12 · 간격 8, 날짜 `Label/xs`).
 * 점: 지남 12 #B8B7B3 / 지금 16 #F7F7F6 + 보라 테두리 3 / 앞으로 12 흰 + #DDDCDA 테두리 2 / 취소 12 #B8B7B3.
 * 선: 지남 #B8B7B3 / 그 밖 #DDDCDA. 마지막 단계는 선이 없다.
 */
export const panel = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[5],
  padding: vars.space[5],
});

export const head = style({ display: 'flex', flexDirection: 'column', gap: vars.space[1] });

export const timeline = style([
  sprinkles({ listStyle: 'none' }),
  { display: 'flex', flexDirection: 'column', gap: vars.space[2], margin: 0, padding: 0 },
]);

export const step = style({ display: 'flex', gap: vars.space[3], minWidth: 0 });

export const stepBoxed = style({ gap: vars.space[1] });

export const rail = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.space[1],
  flexShrink: 0,
  width: 20,
});

export const dot = style({
  flexShrink: 0,
  boxSizing: 'border-box',
  width: 12,
  height: 12,
  borderRadius: vars.radius.full,
});

export const dotState = styleVariants({
  past: { background: vars.color.interaction.inactive },
  current: {
    width: 16,
    height: 16,
    background: vars.color.surface.container,
    border: `3px solid ${vars.color.brand.primary}`,
  },
  upcoming: {
    background: vars.color.background.normal,
    border: `2px solid ${vars.color.surface.defaultBorder}`,
  },
  canceled: { background: vars.color.interaction.inactive },
});

export const line = style({ flex: '1 1 auto', width: 2, minHeight: vars.space[3] });

export const lineState = styleVariants({
  past: { background: vars.color.interaction.inactive },
  current: { background: vars.color.surface.defaultBorder },
  upcoming: { background: vars.color.surface.defaultBorder },
  canceled: { background: vars.color.surface.defaultBorder },
});

export const content = style({ display: 'flex', flexDirection: 'column', minWidth: 0 });

export const box = style({
  flex: '1 1 auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: vars.space[2],
  minWidth: 0,
  padding: vars.space[3],
  borderRadius: vars.radius[4],
  background: vars.color.surface.container,
});

export const texts = style({ display: 'flex', flexDirection: 'column', gap: vars.space[1] });
