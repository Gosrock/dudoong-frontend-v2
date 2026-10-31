import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

export const root = style({ display: 'flex', flexDirection: 'column', gap: vars.space[3] });

export const toolbar = style({ display: 'flex', flexWrap: 'wrap', gap: vars.space[2] });

/** 본문 칸 — Figma는 테두리 없는 빈 영역. 쓰는 자리가 보이게 최소 높이만 둔다 */
export const content = style({ flex: '1 0 auto' });

export const prose = style({
  minHeight: 320,
  outline: 'none',
  borderRadius: vars.radius[2],
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 4 },
  },
});

globalStyle(`${prose} img`, { maxWidth: '100%', height: 'auto', borderRadius: vars.radius[2] });
globalStyle(`${prose} img.ProseMirror-selectednode`, {
  outline: `2px solid ${vars.color.brand.primary}`,
});
