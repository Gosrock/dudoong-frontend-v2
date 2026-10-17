import { globalStyle } from '@vanilla-extract/css';

import { vars } from './tokens.css';

globalStyle('*, *::before, *::after', { boxSizing: 'border-box' });
globalStyle('html, body', { margin: 0, padding: 0 });
globalStyle('body', {
  fontFamily: vars.font.body,
  color: vars.color.text.primary,
  background: vars.color.background.normal,
  WebkitFontSmoothing: 'antialiased',
  wordBreak: 'keep-all',
  overflowWrap: 'anywhere',
});
globalStyle('h1, h2, h3, h4, h5, h6, p', { margin: 0 });
globalStyle('button', { font: 'inherit', color: 'inherit' });
globalStyle('a', { color: 'inherit', textDecoration: 'none' });
globalStyle('img, svg', { display: 'block', maxWidth: '100%' });
globalStyle(':focus-visible', {
  outline: `2px solid ${vars.color.brand.primary}`,
  outlineOffset: 2,
});
