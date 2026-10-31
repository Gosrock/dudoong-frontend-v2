import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/**
 * 상단 배너 — 디자인 없음(design-requests Q44). DS 토큰만: 배경 `surface/container`, 아래 선 `surface/default-border`,
 * 높이 48(아이콘 24 · 아이콘 버튼 40 + 여백). 좌우 여백은 `Container`(본문과 같은 줄에 글자가 선다).
 */
export const bar = style({
  background: vars.color.surface.container,
  borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
});

export const inner = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
  minHeight: 48,
});

export const link = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
  flex: 1,
  minWidth: 0,
  color: vars.color.text.primary,
  textDecoration: 'none',
  selectors: { '&:hover': { textDecoration: 'underline' } },
});

export const icon = style({ display: 'flex', flexShrink: 0, color: vars.color.text.brandLabel });

export const text = style({ minWidth: 0 });

/** HeaderIconButton의 음수 여백(-8)을 오른쪽 끝에서만 남긴다 — 글자와 겹치지 않게 */
export const close = style({ margin: '0 -8px 0 0' });
