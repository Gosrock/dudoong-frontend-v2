import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/** 칸 묶음 — 위아래 16, 제목·칸 사이 10(→ 8) */
export const section = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  padding: `${vars.space[4]} 0`,
});

export const preLine = style({ whiteSpace: 'pre-line' });

export const fieldError = style({ margin: 0 });

export const visuallyHidden = style({
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
});

/** 하단 고정 바 — 화면(가운데 영역) 아래에 붙는다. 모바일 위아래 36(→ 32) · 좌우 24, PC 24 · 위 테두리 */
export const bottomBar = style({
  position: 'sticky',
  bottom: 0,
  zIndex: 1,
  marginTop: 'auto',
  background: vars.color.background.normal,
  padding: `${vars.space[4]} ${vars.space[5]}`,
  paddingBottom: `calc(${vars.space[4]} + env(safe-area-inset-bottom))`,
  '@media': {
    [media.desktop]: {
      padding: vars.space[5],
      borderTop: `1px solid ${vars.color.surface.defaultBorder}`,
    },
  },
});

export const bottomInner = style({
  display: 'flex',
  gap: vars.space[2],
  '@media': { [media.desktop]: { justifyContent: 'flex-end' } },
});

/** 모바일 Large 56 · PC medium 46 — 같은 DOM, 높이·모서리만 CSS로(DS Button lg ↔ md) */
export const previewButton = style({
  flexShrink: 0,
  height: 56,
  borderRadius: vars.radius[4],
  '@media': { [media.desktop]: { height: 46, borderRadius: vars.radius[3] } },
});

export const saveButton = style({
  flex: '1 1 auto',
  height: 56,
  borderRadius: vars.radius[4],
  '@media': {
    [media.desktop]: { flex: '0 0 auto', width: 229, height: 46, borderRadius: vars.radius[3] },
  },
});
