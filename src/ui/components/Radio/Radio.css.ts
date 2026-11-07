import { style, styleVariants } from '@vanilla-extract/css';

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
 * Figma Radio(`295:1858`): 20, 테두리 1.25 가운데 정렬(바깥 지름 20 — 2026-11-01, 옛 판은 바깥 정렬이라 21.25),
 * 테두리 `surface/strong-border`(선택·미선택 같음 — 2026-11-01 미선택이 `surface/default-border`에서 바뀜),
 * 가운데 점 10 `text/primary-label`. 바탕은 채움 없음(`295:1851` fills 없음 — M-2 2026-11-08). `disabled?=true`(2026-11-01 새로)는 테두리·점 `interaction/disabled`, 채움 없음.
 */
export const item = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 20,
  height: 20,
  padding: 0,
  border: `1.25px solid ${vars.color.surface.strongBorder}`,
  borderRadius: vars.radius.full,
  background: 'transparent',
  cursor: 'pointer',
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
    '&:disabled': { cursor: 'not-allowed', borderColor: vars.color.interaction.disabled },
  },
});

export const dot = style({
  width: 10,
  height: 10,
  borderRadius: vars.radius.full,
  background: vars.color.text.primaryLabel,
  selectors: { '[data-disabled] > &': { background: vars.color.interaction.disabled } },
});

/** GUI 라디오 글자: `text/primary-label`, 크기는 `labelSize` */
export const label = style([
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

/** md — 16 Regular(Body/lg) · sm — 14 Regular(Body/md, GUI `1029:7095` 사유 목록, I-h4) */
export const labelSize = styleVariants({ md: [typography.bodyLg], sm: [typography.bodyMd] });
