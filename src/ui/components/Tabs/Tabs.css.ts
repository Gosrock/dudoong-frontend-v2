import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/** Figma tab(`271:1234`): 탭 사이 24 */
export const list = style({
  display: 'flex',
  gap: vars.space[5],
});

/**
 * Figma tab item(`271:1227`): 16 Bold, 미선택 `text/primary`, 선택 `brand/primary` + 아래 2px `brand/primary`.
 * 높이는 Figma 선택 44 · 미선택 42를 44 하나로 맞춘다(design-system §3 정리 요청).
 */
export const tab = style([
  typography.labelLgEmphasized,
  {
    display: 'inline-flex',
    alignItems: 'center',
    height: 44,
    padding: 0,
    border: 'none',
    borderBottom: '2px solid transparent',
    background: 'transparent',
    color: vars.color.text.primary,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    selectors: {
      '&[data-state="active"]': {
        color: vars.color.brand.primary,
        borderBottomColor: vars.color.brand.primary,
      },
      '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
      '&:disabled': { cursor: 'not-allowed', color: vars.color.interaction.disabledText },
    },
  },
]);

export const panel = style({ outline: 'none' });
