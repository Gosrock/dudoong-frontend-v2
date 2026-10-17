import { recipe } from '@vanilla-extract/recipes';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/**
 * Figma Badge(`213:29`). large 20×20(숫자), small 8×8(점), 배경 `brand/accent`.
 * large는 Figma가 고정 20×20이라 두 자리를 못 담는다 — 최소 폭 20 + 좌우 패딩으로 늘린다(design-system §3 "없는 상태").
 */
export const badge = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: vars.color.brand.accent,
    color: vars.color.text.onBrand,
    borderRadius: vars.radius.full,
  },
  variants: {
    size: {
      large: [
        typography.labelSm,
        {
          minWidth: 20,
          height: 20,
          padding: `0 ${vars.space[1]}`,
          fontVariantNumeric: 'tabular-nums',
        },
      ],
      small: { width: 8, height: 8 },
    },
  },
  defaultVariants: { size: 'large' },
});
