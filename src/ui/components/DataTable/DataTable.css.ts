import { style, styleVariants } from '@vanilla-extract/css';

import { media } from '../../theme/breakpoints';
import { sprinkles } from '../../theme/sprinkles.css';
import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/**
 * Figma에 DS 표 컴포넌트가 없다(design-system §3 "여전히 없는 것"). 모양은 GUI 예매자 관리 표(`1026:4526` "주문 표" — 직접 그린 상자,
 * 2026-11-01 Ready)를 따른다: 테두리 `surface/default-border` · 모서리 8, 머리글 44h `surface/container` 배경 · `Label/sm`
 * `text/secondary-label`, 행 56h · `Body/md`, 칸 사이 16 · 양 끝 16
 */
export const scroller = style({
  width: '100%',
  overflowX: 'auto',
  border: `1px solid ${vars.color.surface.defaultBorder}`,
  borderRadius: vars.radius[2],
});

export const table = style({
  width: '100%',
  borderCollapse: 'collapse',
  background: vars.color.background.normal,
});

// 모바일(`984:360` "주문 표 머리글_모바일"): 칸 사이 8 · 왼쪽 12 · 오른쪽 8, 머리글 40h. PC(`1026:4527`): 칸 사이 16 · 양 끝 16, 머리글 44h.
// 양 끝 칸은 폭마다 다를 수 있어(`display`로 숨는 칸) DataTable이 `edge`로 표시한다
const cellPadding = {
  padding: `0 ${vars.space[1]}`,
  '@media': { [media.desktop]: { padding: `0 ${vars.space[2]}` } },
} as const;

export const th = style([
  typography.labelSm,
  cellPadding,
  {
    height: 40,
    background: vars.color.surface.container,
    borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
    color: vars.color.text.secondaryLabel,
    whiteSpace: 'nowrap',
    '@media': { [media.desktop]: { height: 44 } },
  },
]);

export const td = style([
  typography.bodyMd,
  cellPadding,
  {
    height: 56,
    borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
    color: vars.color.text.primaryLabel,
    verticalAlign: 'middle',
    selectors: { 'tr:last-child > &': { borderBottom: 'none' } },
  },
]);

/** 칸을 폭 하나에서만 보인다(서버·클라이언트 같은 DOM — 무엇이 보일지는 CSS, patterns §1) */
export const display = styleVariants({
  all: {},
  desktop: { display: 'none', '@media': { [media.desktop]: { display: 'table-cell' } } },
  mobile: { '@media': { [media.desktop]: { display: 'none' } } },
});

/** 그 폭에서 보이는 첫 칸 · 끝 칸 */
export const edge = styleVariants({
  startMobile: {
    '@media': { 'screen and (max-width: 1023.98px)': { paddingLeft: vars.space[3] } },
  },
  endMobile: { '@media': { 'screen and (max-width: 1023.98px)': { paddingRight: vars.space[2] } } },
  startDesktop: { '@media': { [media.desktop]: { paddingLeft: vars.space[4] } } },
  endDesktop: { '@media': { [media.desktop]: { paddingRight: vars.space[4] } } },
});

/** `width`는 PC에서만(모바일 표는 좁아 칸이 내용 폭) — 값은 `--dt-col-width` */
export const desktopWidth = style({
  '@media': { [media.desktop]: { width: 'var(--dt-col-width)' } },
});

export const align = styleVariants({
  left: { textAlign: 'left' },
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },
});

export const row = style({
  selectors: {
    '&[data-selected="true"]': { background: vars.color.surface.container },
    '&[data-clickable="true"]': { cursor: 'pointer' },
    '&[data-clickable="true"]:hover': { background: vars.color.surface.container },
    '&[data-clickable="true"]:focus-visible': {
      outline: `2px solid ${vars.color.brand.primary}`,
      outlineOffset: -2,
    },
  },
});

/** 빈 상태·로딩·실패 슬롯 칸 — GUI 빈 표 320h(`1029:4849` 결과 없음 · `1029:5135` 불러오기 실패) */
export const slotCell = style({ height: 320, padding: vars.space[6], textAlign: 'center' });

/** 표 아래 줄 — 페이지 번호는 가운데, `footerEnd`(엑셀 등)는 오른쪽 끝(GUI `< 1 >` · [엑셀로 다운로드]) */
export const footer = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 32,
  marginTop: vars.space[4],
});

export const footerPages = style({ display: 'flex', justifyContent: 'center' });

export const footerEnd = style({
  position: 'absolute',
  right: 0,
  top: '50%',
  transform: 'translateY(-50%)',
});

export const pagination = style([
  sprinkles({ listStyle: 'none' }),
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: vars.space[1],
    margin: 0,
    padding: 0,
  },
]);

export const pageButton = style([
  typography.labelMd,
  {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
    height: 32,
    padding: `0 ${vars.space[1]}`,
    border: 'none',
    borderRadius: vars.radius[2],
    background: 'none',
    color: vars.color.text.secondaryLabel,
    cursor: 'pointer',
    fontVariantNumeric: 'tabular-nums',
    selectors: {
      '&:hover:not(:disabled)': { background: vars.color.surface.container },
      '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 0 },
      '&:disabled': { cursor: 'not-allowed', color: vars.color.interaction.disabledText },
      // GUI 예매자 관리 페이지 줄(`< 1 >`) — 지금 페이지는 배경 없이 진한 글자
      '&[aria-current="page"]': { color: vars.color.text.primaryLabel },
    },
  },
]);

export const ellipsis = style([
  typography.labelMd,
  {
    display: 'inline-flex',
    justifyContent: 'center',
    minWidth: 24,
    color: vars.color.text.tertiary,
  },
]);
