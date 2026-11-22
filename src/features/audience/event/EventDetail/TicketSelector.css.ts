import { style } from '@vanilla-extract/css';

import { sprinkles } from '@/ui/theme/sprinkles.css';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 티켓 고르는 목록 — GUI 로컬 "ticket option list"(`1948:39630`): 흰 판 · 테두리 1 `surface/default-border` · 모서리 20 ·
 * 안쪽 8, 줄 사이 0. 줄은 "ticket options"(모서리 16 · 안쪽 16), 고른 줄 채움 `#eeeeed`(`1948:26087` — `interaction/disabled-bg`와 같은 값).
 */
export const list = style([
  sprinkles({ listStyle: 'none' }),
  {
    margin: 0,
    padding: vars.space[2],
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    border: `1px solid ${vars.color.surface.defaultBorder}`,
    borderRadius: vars.radius[6],
    background: vars.color.background.normal,
  },
]);

export const row = style({
  display: 'flex',
  width: '100%',
  padding: vars.space[4],
  border: 'none',
  borderRadius: vars.radius[5],
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  selectors: {
    '&[data-selected]': { background: vars.color.interaction.disabledBg },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: -2 },
    '&:disabled': { cursor: 'default' },
  },
  // 터치 기기에서 누른 뒤 호버 색이 남지 않게 마우스가 있을 때만
  '@media': {
    '(hover: hover)': {
      selectors: {
        '&:hover:not(:disabled):not([data-selected])': { background: vars.color.surface.container },
      },
    },
  },
});

export const pickedMain = style({ flex: 1, minWidth: 0 });

/** 선택 취소 ✕ — `ic/close` 24 · 회색 `#b8b7b3`(GUI `759:22121`, Neutral 300 = `text/tertiary`) */
export const iconButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
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

/** 두둥 티켓 안내(legal-copy A-4) — 회색 글 3줄 */
export const notice = style([
  sprinkles({ listStyle: 'none' }),
  {
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: vars.space[1],
  },
]);
