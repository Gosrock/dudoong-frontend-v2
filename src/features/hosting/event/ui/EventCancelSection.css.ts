import { globalStyle, style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 취소된 공연 안내(GUI `취소 안내` `1912:3661` · 모바일 `1912:4466`, Design Sync #326 · #332) — #FEEDEC(`brand/accent-subtle`) ·
 * 모서리 20 · 패딩 16 · 간격 8. 자리 · 좌우 여백은 대시보드가 정한다(머리 묶음 안)
 */
export const canceledBox = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: vars.space[2],
  padding: vars.space[4],
  borderRadius: vars.radius[6],
  background: vars.color.brand.accentSubtle,
});

export const lines = style({ whiteSpace: 'pre-line', margin: 0 });
export const line = style({ display: 'inline' });

/** 상자 안 흰 버튼 — 높이 45 · 모서리 10 · 좌우 16, `Label/md - emphasized` 회색 글자(GUI `Button` 107×45) */
export const boxButton = style({
  selectors: {
    '&&': {
      height: 45,
      padding: `0 ${vars.space[4]}`,
      borderRadius: vars.radius[3],
      background: vars.color.background.normal,
      color: vars.color.text.secondaryLabel,
      textDecoration: 'none',
    },
  },
});

/**
 * 맨 아래 `공연 취소`(GUI `1912:3126` · `712:1646` PC 784 — 위 24 · 오른쪽 24 · 아래 40 · 왼쪽 24, 간격 8 / 모바일 `1913:37061` 위아래 24,
 * 간격 12). 위 선 #F7F7F6. 아이콘 칸 20(아이콘 16) + 글자 묶음(간격 8)
 */
export const section = style({
  display: 'flex',
  gap: vars.space[3],
  padding: `${vars.space[5]} 0`,
  borderTop: `1px solid ${vars.color.surface.container}`,
  '@media': {
    [media.desktop]: {
      gap: vars.space[2],
      padding: `${vars.space[5]} ${vars.space[5]} ${vars.space[7]}`,
    },
  },
});

export const sectionIcon = style({
  display: 'inline-flex',
  flexShrink: 0,
  width: 20,
  height: 20,
  alignItems: 'center',
  justifyContent: 'center',
});
globalStyle(`${sectionIcon} > svg`, { width: 16, height: 16 });

/** [공연 취소하기] 줄 — 위 8(GUI `공연 취소하기` 패딩 위 8) */
export const textButtonRow = style({ paddingTop: vars.space[2] });

export const textButton = style({
  padding: 0,
  border: 0,
  background: 'none',
  cursor: 'pointer',
  borderRadius: vars.radius[1],
  selectors: {
    '&:hover': { textDecoration: 'underline', textDecorationColor: vars.color.text.dangerLabel },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

/** 확인 창 분홍 안내(GUI `안내` 432×64 — #FEEDEC · 모서리 12 · 패딩 12, `Body/md` 빨강) */
export const warnBox = style({
  margin: 0,
  padding: vars.space[3],
  borderRadius: vars.radius[4],
  background: vars.color.brand.accentSubtle,
});
