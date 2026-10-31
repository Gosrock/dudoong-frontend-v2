import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 시트 본문 — 칸 묶음 사이 24(GUI `932:1567` 간격 24) */
export const body = style({ display: 'flex', flexDirection: 'column', gap: vars.space[5] });

/** 옵션 고르기 목록 — 항목 사이 8 */
export const pickList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

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

/** 칸 묶음: 제목 + 안내 + 칸(간격 10 → 8) */
export const field = style({ display: 'flex', flexDirection: 'column', gap: vars.space[2] });

/** 제목 줄 + 오른쪽 토글 */
export const toggleRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.space[4],
});

export const radios = style({ display: 'flex', gap: vars.space[7] });

/** 금액 칸 195(GUI `943:2265`) */
export const price = style({ maxWidth: 195 });

/** 상세 머리 줄 [수정] (`943:2390`) */
export const detailTop = style({ display: 'flex', justifyContent: 'flex-start' });

export const muted = style({ opacity: 0.5 });

/** 상세 하단 [옵션 삭제] — 디자인 없음(plan P12 기본안) */
export const deleteRow = style({ display: 'flex', justifyContent: 'center' });
