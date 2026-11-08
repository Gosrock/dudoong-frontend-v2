import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';
import { typography } from '@/ui/theme/typography.css';

export const icon = style({ width: 18, height: 18, flexShrink: 0 });

export const sheetList = style({ listStyle: 'none', margin: 0, padding: 0 });

/**
 * 시트 항목 — GUI `1336:1557`(#191): 51h · 안쪽 위아래 16 · 좌우 10 · 아이콘 ↔ 글자 12 · `Label/lg` · 모서리 4.
 * 누름 배경은 `surface/container`(Figma 첫 줄 모양). 삭제는 `text/danger-label`
 */
export const sheetItem = style([
  typography.labelLg,
  {
    display: 'flex',
    alignItems: 'center',
    gap: vars.space[3],
    width: '100%',
    padding: `${vars.space[4]} 10px`,
    border: 'none',
    borderRadius: vars.radius[1],
    background: 'transparent',
    color: vars.color.text.primary,
    textAlign: 'left',
    cursor: 'pointer',
    selectors: {
      '&:hover:not(:disabled), &:active:not(:disabled)': {
        background: vars.color.surface.container,
      },
      '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: -2 },
      '&[data-danger="true"]:not(:disabled)': { color: vars.color.text.dangerLabel },
      '&:disabled': { color: vars.color.interaction.disabledText, cursor: 'not-allowed' },
    },
  },
]);

/**
 * PC 탭 이름 입력 — GUI `1320:811`: 200×36 · 흰 · 테두리 2 `brand/primary` · 모서리 8 · 안쪽 좌우 12 ·
 * 바깥 빛(그림자 `brand/primary` 20%) · 글자 수는 오른쪽 끝
 */
export const field = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[2],
  alignSelf: 'center',
  width: 200,
  height: 36,
  padding: `0 ${vars.space[3]}`,
  background: vars.color.background.normal,
  border: `2px solid ${vars.color.brand.primary}`,
  borderRadius: vars.radius[2],
  boxShadow: `0 0 0 3px color-mix(in srgb, ${vars.color.brand.primary} 20%, transparent)`,
  flexShrink: 0,
});

export const fieldInput = style([
  typography.headingMd2,
  {
    flex: '1 1 auto',
    minWidth: 0,
    padding: 0,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: vars.color.text.primary,
    selectors: { '&::selection': { background: vars.color.brand.primaryContainer } },
  },
]);

export const fieldCount = style([
  typography.labelSm,
  { flexShrink: 0, color: vars.color.text.secondary },
]);
