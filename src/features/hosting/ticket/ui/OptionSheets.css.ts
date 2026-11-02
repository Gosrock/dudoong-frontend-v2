import { style } from '@vanilla-extract/css';

import { sprinkles } from '@/ui/theme/sprinkles.css';
import { vars } from '@/ui/theme/tokens.css';

/** 시트 본문 — 칸 묶음 사이 24(GUI `932:1567` 간격 24) */
export const body = style({ display: 'flex', flexDirection: 'column', gap: vars.space[5] });

/** 옵션 고르기 목록 — 항목 사이 8 */
export const pickList = style([
  sprinkles({ listStyle: 'none' }),
  {
    display: 'flex',
    flexDirection: 'column',
    gap: vars.space[2],
    margin: 0,
    padding: 0,
  },
]);

/**
 * 옵션 고르기 항목 — GUI 로컬 컴포넌트 `옵션 선택 항목`(`931:1323`): 342×72 · 패딩 12 16 · 간격 12 · 모서리 8 ·
 * 테두리 `surface/default-border`, 고르면 테두리 `brand/primary` + 배경 `brand/primary-subtle`(`931:1356`).
 * 이미 붙은 옵션은 고른 모양 + 흐리게(`940:13011`)
 */
export const pickItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  minHeight: 72,
  padding: `${vars.space[3]} ${vars.space[4]}`,
  border: `1px solid ${vars.color.surface.defaultBorder}`,
  borderRadius: vars.radius[2],
  background: vars.color.background.normal,
  cursor: 'pointer',
  selectors: {
    '&[data-selected="true"]': {
      borderColor: vars.color.brand.primary,
      background: vars.color.brand.primarySubtle,
    },
    '&[data-disabled="true"]': { cursor: 'not-allowed' },
    '&[data-attached="true"]': { opacity: 0.5 },
  },
});

export const pickText = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  minWidth: 0,
});

/** 시트 머리 ← + 제목(`932:1570`) */
export const titleRow = style({ display: 'inline-flex', alignItems: 'center', gap: vars.space[2] });

export const backButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
});

/** DS 컴포넌트에 붙는 클래스는 `'&&'`로 세기를 올린다 — CSS 청크 순서와 상관없이 DS 기본값을 덮게(`ContactRows` · 옵션 칸) */
export const radios = style({ selectors: { '&&': { display: 'flex', gap: vars.space[7] } } });

/** 금액 칸 195(GUI `943:2265`) */
export const price = style({ selectors: { '&&': { maxWidth: 195 } } });
