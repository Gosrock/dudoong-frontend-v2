import { recipe, type RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../../theme/tokens.css';

// P0 수직 슬라이스용 최소 버전. 전체 변형(design-system.md §3 Button)은 P2에서 만든다.
export const button = recipe({
  base: {
    border: 0,
    cursor: 'pointer',
    fontWeight: 700,
    color: vars.color.textOnBrand,
    background: vars.color.brandPrimary,
    selectors: {
      '&:active': { background: vars.color.brandPrimaryPressed },
      '&:disabled': { cursor: 'not-allowed', opacity: 0.4 },
    },
  },
  variants: {
    size: {
      sm: { height: 32, padding: `0 ${vars.space[3]}`, borderRadius: vars.radius[2], fontSize: 12 },
      md: { height: 45, padding: `0 ${vars.space[4]}`, borderRadius: vars.radius[3], fontSize: 14 },
    },
  },
  defaultVariants: { size: 'md' },
});

export type ButtonVariants = NonNullable<RecipeVariants<typeof button>>;
