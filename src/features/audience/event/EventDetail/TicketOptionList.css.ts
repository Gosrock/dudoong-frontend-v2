import { style } from '@vanilla-extract/css';

import { sprinkles } from '@/ui/theme/sprinkles.css';
import { vars } from '@/ui/theme/tokens.css';

/** 카드 사이 8(GUI `759:13039`) */
export const list = style([
  sprinkles({ listStyle: 'none' }),
  {
    margin: 0,
    padding: 0,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: vars.space[2],
  },
]);
export const main = style({ flex: 1, minWidth: 0 });
export const side = style({ flexShrink: 0 });

/** 화면 티켓 카드 — 채움 `brand/secondary` · 모서리 16 · 안쪽 16(GUI `759:13040`). 눌림은 `brand/secondary` 호버 · 눌림 색 */
export const card = style({
  display: 'flex',
  width: '100%',
  padding: vars.space[4],
  border: 'none',
  borderRadius: vars.radius[5],
  background: vars.color.brand.secondary,
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  selectors: {
    '&:active:not(:disabled)': { background: vars.color.brand.secondaryPressed },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
    '&:disabled': { cursor: 'default' },
  },
  // 터치 기기에서 누른 뒤 호버 색이 남지 않게 마우스가 있을 때만
  '@media': {
    '(hover: hover)': {
      selectors: {
        '&:hover:not(:disabled):not(:active)': { background: vars.color.brand.secondaryHover },
      },
    },
  },
});
