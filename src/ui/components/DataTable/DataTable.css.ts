import { style, styleVariants } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/** Figma에 표가 없다(design-system §3 "여전히 없는 것") — list·Filter Chip과 같은 선·글자 토큰으로 맞췄다 */
export const scroller = style({
  width: '100%',
  overflowX: 'auto',
  border: `1px solid ${vars.color.surface.defaultBorder}`,
  borderRadius: vars.radius[2],
});

export const table = style({
  width: '100%',
  borderCollapse: 'collapse',
  background: vars.color.background.normal,
});

export const caption = style({
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
});

export const th = style([
  typography.labelMdEmphasized,
  {
    padding: `${vars.space[3]} ${vars.space[4]}`,
    background: vars.color.surface.container,
    borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
    color: vars.color.text.secondaryLabel,
    whiteSpace: 'nowrap',
  },
]);

export const td = style([
  typography.bodyMd,
  {
    padding: `${vars.space[3]} ${vars.space[4]}`,
    borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
    color: vars.color.text.primaryLabel,
    verticalAlign: 'middle',
    selectors: { 'tr:last-child > &': { borderBottom: 'none' } },
  },
]);

export const align = styleVariants({
  left: { textAlign: 'left' },
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },
});

export const row = style({
  selectors: {
    '&[data-clickable="true"]': { cursor: 'pointer' },
    '&[data-clickable="true"]:hover': { background: vars.color.surface.container },
    '&[data-clickable="true"]:focus-visible': {
      outline: `2px solid ${vars.color.brand.primary}`,
      outlineOffset: -2,
    },
  },
});

/** 빈 상태·로딩 슬롯 칸 */
export const slotCell = style({ padding: vars.space[6], textAlign: 'center' });

export const pagination = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: vars.space[1],
  marginTop: vars.space[4],
  padding: 0,
  listStyle: 'none',
});

export const pageButton = style([
  typography.labelMd,
  {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
    height: 32,
    padding: `0 ${vars.space[1]}`,
    border: 'none',
    borderRadius: vars.radius[2],
    background: 'none',
    color: vars.color.text.secondaryLabel,
    cursor: 'pointer',
    fontVariantNumeric: 'tabular-nums',
    selectors: {
      '&:hover:not(:disabled)': { background: vars.color.surface.container },
      '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 0 },
      '&:disabled': { cursor: 'not-allowed', color: vars.color.interaction.disabledText },
      '&[aria-current="page"]': {
        background: vars.color.text.primary,
        color: vars.color.text.inverse,
      },
    },
  },
]);

export const ellipsis = style([
  typography.labelMd,
  {
    display: 'inline-flex',
    justifyContent: 'center',
    minWidth: 24,
    color: vars.color.text.tertiary,
  },
]);
