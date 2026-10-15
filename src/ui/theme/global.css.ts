import { globalStyle } from '@vanilla-extract/css';

import { vars } from './tokens.css';

globalStyle('*, *::before, *::after', { boxSizing: 'border-box' });
globalStyle('html, body', { margin: 0, padding: 0 });
globalStyle('body', {
  fontFamily: vars.font.body,
  color: vars.color.textPrimary,
  background: vars.color.backgroundNormal,
});
