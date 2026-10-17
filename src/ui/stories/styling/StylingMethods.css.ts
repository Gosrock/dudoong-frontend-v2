import { keyframes, style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';

const pulse = keyframes({ '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } });

/** ③ `Foo.css.ts` — 고유한 모양, 자손 선택자, 애니메이션 */
export const card = style({
  padding: vars.space[4],
  borderRadius: vars.radius[4],
  border: `1px solid ${vars.color.surface.defaultBorder}`,
  selectors: { '&:hover': { borderColor: vars.color.brand.primary } },
});
export const live = style({
  animation: `${pulse} 1.6s ease-in-out infinite`,
  color: vars.color.brand.accent,
});
