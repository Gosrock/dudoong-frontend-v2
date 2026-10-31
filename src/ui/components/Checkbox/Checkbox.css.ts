import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/**
 * Figma Checkbox `Box`(`120:1249`): 20, `type` round(모서리 16 `Space/4` — 20의 원형) · square(모서리 4 `Space/1`, 2026-11-01). 꺼짐은 2px 테두리 `text/primary-label`, 켜짐은 채움 `text/primary-label`(검정)
 * + 체크 `text/on-brand`. disabled는 같은 자리에 `interaction/disabled`.
 */
export const root = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: 20,
    height: 20,
    padding: 0,
    // 미선택 테두리 `interaction/inactive`(DS 2026-10-31T17:25Z 판 — 옛 `text/primary-label`), 선택은 아래 검정
    border: `2px solid ${vars.color.interaction.inactive}`,
    background: 'transparent',
    color: vars.color.text.onBrand,
    cursor: 'pointer',
    selectors: {
      '&[data-state="checked"]': {
        borderColor: vars.color.text.primaryLabel,
        background: vars.color.text.primaryLabel,
      },
      '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
      '&:disabled': { cursor: 'not-allowed', borderColor: vars.color.interaction.disabled },
      '&:disabled[data-state="checked"]': { background: vars.color.interaction.disabled },
    },
  },
  variants: {
    shape: {
      // Figma는 16(`Space/4`)이지만 20의 반을 넘어 원형과 같다 — design-system §4 "높이 절반 이상은 원형"
      round: { borderRadius: vars.radius.full },
      square: { borderRadius: vars.radius[1] },
    },
  },
  defaultVariants: { shape: 'round' },
});

export const indicator = style({ display: 'inline-flex' });

export const label = style([
  typography.bodyLg,
  {
    display: 'inline-flex',
    alignItems: 'center',
    gap: vars.space[2],
    color: vars.color.text.primaryLabel,
    cursor: 'pointer',
    selectors: {
      '&[data-disabled="true"]': {
        color: vars.color.interaction.disabledText,
        cursor: 'not-allowed',
      },
    },
  },
]);
