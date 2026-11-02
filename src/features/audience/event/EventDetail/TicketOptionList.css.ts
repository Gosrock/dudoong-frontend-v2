import { style } from '@vanilla-extract/css';

import { sprinkles } from '@/ui/theme/sprinkles.css';

export const list = style([
  sprinkles({ listStyle: 'none' }),
  { margin: 0, padding: 0, width: '100%' },
]);
export const main = style({ flex: 1, minWidth: 0 });
export const side = style({ flexShrink: 0 });
