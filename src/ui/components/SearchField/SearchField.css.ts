import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';

/** 브라우저 기본 지우기(×)를 숨기고 우리 버튼을 쓴다 */
export const control = style({
  selectors: {
    '&::-webkit-search-cancel-button': { appearance: 'none' },
    '&::-webkit-search-decoration': { appearance: 'none' },
  },
});

export const clear = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 20,
  height: 20,
  padding: 0,
  border: 'none',
  borderRadius: vars.radius.full,
  background: 'transparent',
  color: vars.color.text.tertiary,
  cursor: 'pointer',
  selectors: {
    '&:hover': { color: vars.color.text.secondary },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});
globalStyle(`${clear} > svg`, { width: 20, height: 20 });
