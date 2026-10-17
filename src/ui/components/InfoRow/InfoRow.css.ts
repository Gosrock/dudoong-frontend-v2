import { style, styleVariants } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/**
 * Figma list(`202:2034`) — 390×48, 패딩 12·24, 양끝 정렬.
 * 선: First는 아래, second-*는 위·아래, third는 없음.
 */
export const row = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.space[4],
  width: '100%',
  minHeight: 48,
  margin: 0,
  padding: `${vars.space[3]} ${vars.space[5]}`,
  boxSizing: 'border-box',
});

export const hierarchy = styleVariants({
  first: { borderBottom: `1px solid ${vars.color.surface.defaultBorder}` },
  second: {
    borderTop: `1px solid ${vars.color.surface.defaultBorder}`,
    borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
  },
  third: {},
});

export const label = styleVariants({
  first: [typography.labelLgEmphasized, { color: vars.color.text.primaryLabel }],
  second: [typography.labelMd, { color: vars.color.text.secondaryLabel }],
  third: [typography.labelMdEmphasized, { color: vars.color.text.secondaryLabel }],
});

/** 값이 글자일 때. First는 보라(`text/brand-label`), 나머지는 회색 */
export const valueText = styleVariants({
  first: [typography.labelMd, { color: vars.color.text.brandLabel }],
  second: [typography.labelMd, { color: vars.color.text.secondaryLabel }],
  third: [typography.labelMd, { color: vars.color.text.secondary }],
});

export const labelCell = style({ minWidth: 0, flexShrink: 0, margin: 0 });

export const value = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: vars.space[2],
  minWidth: 0,
  margin: 0,
  textAlign: 'right',
  overflowWrap: 'anywhere',
});

/** account의 "복사" 버튼 — Figma는 컴포넌트가 아닌 38×20, 모서리 6, 글자 10 */
export const copyButton = style([
  typography.labelXs,
  {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    height: 20,
    padding: `0 ${vars.space[2]}`,
    border: `1px solid ${vars.color.surface.defaultBorder}`,
    borderRadius: vars.radius[1],
    background: vars.color.background.normal,
    color: vars.color.text.secondary,
    cursor: 'pointer',
    selectors: {
      '&:hover': { background: vars.color.surface.container },
      '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
    },
  },
]);
