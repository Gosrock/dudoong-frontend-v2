import { style } from '@vanilla-extract/css';

import { media } from '../theme/breakpoints';
import { vars } from '../theme/tokens.css';

export const divider = style({
  border: 0,
  margin: 0,
  flexShrink: 0,
  background: vars.color.surface.defaultBorder,
  selectors: {
    '&[data-direction="horizontal"]': { height: 1, width: '100%' },
    '&[data-direction="vertical"]': { width: 1, alignSelf: 'stretch' },
  },
});

/**
 * 페이지 폭 컨테이너. 좌우 여백은 Figma 그리드 값(Mobile 24 · Desktop-sm 40 · Desktop-lg 80)이고,
 * 최대 폭은 Desktop-lg(1440)에서 여백을 뺀 1280이다(design-system §2).
 */
export const container = style({
  width: '100%',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: 24,
  paddingRight: 24,
  maxWidth: 1280 + 80 * 2,
  '@media': {
    [media.desktop]: { paddingLeft: 40, paddingRight: 40 },
    'screen and (min-width: 1440px)': { paddingLeft: 80, paddingRight: 80 },
  },
});
