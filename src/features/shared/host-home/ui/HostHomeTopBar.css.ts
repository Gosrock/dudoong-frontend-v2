import { style } from '@vanilla-extract/css';

import { fixedBar } from '@/features/shared/shell/shell.css';
import { HEADER_HEIGHT } from '@/ui/theme/bars';
import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/** 화면 위 고정(셸 바와 같은 `fixedBar`) — 커버가 지나간 뒤에만 그린다. PC는 그리지 않는다 */
export const bar = style([
  fixedBar,
  {
    display: 'none',
    height: HEADER_HEIGHT,
    selectors: { '&[data-solid]': { display: 'block' } },
    '@media': { [media.desktop]: { selectors: { '&[data-solid]': { display: 'none' } } } },
  },
]);

/** 커버 위 — 흰 원 두 개(커버 맨 위 64 줄 가운데). PC는 셸 상단 바와 커버 오른쪽 위 ⚙가 있어 그리지 않는다 */
export const floating = style({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: HEADER_HEIGHT,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  // 원 44가 화면 끝에서 14(GUI `1452:40993` x 14 · `1452:40991` x 332)
  paddingLeft: 14,
  paddingRight: 14,
  selectors: { '&:has(> :only-child)': { justifyContent: 'flex-start' } },
  '@media': { [media.desktop]: { display: 'none' } },
});

/** 흰 원 44 + 아이콘 24(GUI 직접 그림 `1452:40993` — 채움 `Background/normal`, 모서리 24) */
export const circle = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 44,
  height: 44,
  padding: 0,
  border: 'none',
  borderRadius: vars.radius.full,
  background: vars.color.background.normal,
  color: vars.color.text.primaryLabel,
  cursor: 'pointer',
  textDecoration: 'none',
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});
