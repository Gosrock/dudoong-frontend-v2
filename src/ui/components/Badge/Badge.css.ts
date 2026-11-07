import { recipe } from '@vanilla-extract/recipes';

import { palette } from '../../theme/palette';
import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/**
 * Figma Badge(`213:29`). large 20×20(숫자), small 8×8(점), 배경 `brand/accent`.
 * 숫자 색은 Figma `198:1638`이 변수 없이 #FFFFFF — 값 그대로(M-2 2026-11-08, 전에는 `text.onBrand` #F7F7F6).
 * large는 Figma가 고정 20×20이라 두 자리를 못 담는다 — 최소 폭 20 + 좌우 패딩으로 늘린다(design-system §3 "없는 상태").
 */
export const badge = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: vars.color.brand.accent,
    color: palette.common.white,
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
