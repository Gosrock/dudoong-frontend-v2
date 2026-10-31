import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

export const group = style({
  display: 'flex',
  flexWrap: 'wrap',
  columnGap: vars.space[5],
  rowGap: vars.space[3],
  selectors: { '&[data-orientation="vertical"]': { flexDirection: 'column' } },
});

/**
 * Figma Radio(`295:1858`): 20, 테두리 1.25(꺼짐 `surface/default-border`, 켜짐 `surface/strong-border`),
 * 가운데 점 10 `text/primary-label`. disabled는 Figma에 없어 `interaction/disabled` 계열(design-system §3).
 */
export const item = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 20,
  height: 20,
  padding: 0,
  border: `1.25px solid ${vars.color.surface.defaultBorder}`,
  borderRadius: vars.radius.full,
  background: vars.color.background.normal,
  cursor: 'pointer',
  selectors: {
    '&[data-state="checked"]': { borderColor: vars.color.surface.strongBorder },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
    '&:disabled': {
      cursor: 'not-allowed',
      borderColor: vars.color.interaction.disabled,
      background: vars.color.interaction.disabledBg,
    },
  },
});

export const dot = style({
  width: 10,
  height: 10,
  borderRadius: vars.radius.full,
  background: vars.color.text.primaryLabel,
  selectors: { '[data-disabled] > &': { background: vars.color.interaction.disabled } },
});

/** GUI 라디오 글자: 16 Regular `text/primary-label` */
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
