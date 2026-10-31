import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

import { textOf } from './text-style';

/**
 * 티켓 카드 — GUI 로컬 컴포넌트 `티켓 행_모바일`(`910:3335`, 342 · 패딩 16 · 간격 8 · 모서리 16 · 채움 #F7F7F6 = `surface/container`)과
 * `티켓 행_데스크탑`(`910:3433`, 554). 위 줄: 왼쪽 정보(간격 4) | 오른쪽 가격 + 재고 칩(아래 정렬, 간격 7 → 8). ⋮ 44 자리는 오른쪽 위.
 * 모바일 이름 `Heading/sm - emphasized` · 줄 `Label/sm` · 가격 `Label/lg-emphasized` · 칩 small, PC 이름·가격 `Heading/md2 - emphasized` ·
 * 줄 `Label/md` · 칩 large — 같은 DOM에서 글자·칩 크기만 CSS로 바꾼다
 */
export const card = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  padding: vars.space[4],
  borderRadius: vars.radius[5],
  background: vars.color.surface.container,
  listStyle: 'none',
});

export const top = style({
  display: 'flex',
  alignItems: 'stretch',
  gap: vars.space[1],
  paddingBottom: vars.space[1],
});

export const info = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  flex: '1 1 auto',
  minWidth: 0,
});

/** 이름 줄 — ⋮ 자리(44 − 패딩 16 + 여백)만큼 오른쪽을 비운다 */
export const nameRow = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: vars.space[2],
  paddingRight: vars.space[6],
});

export const name = style({
  margin: 0,
  ...textOf('headingSmEmphasized'),
  color: vars.color.text.primaryLabel,
  overflowWrap: 'anywhere',
  '@media': { [media.desktop]: textOf('headingMd2Emphasized') },
});

export const line = style({
  margin: 0,
  ...textOf('labelSm'),
  color: vars.color.text.secondaryLabel,
  overflowWrap: 'anywhere',
  '@media': { [media.desktop]: textOf('labelMd') },
});

/** 가격 묶음은 아래로 붙인다(GUI MAX 정렬). 위 32는 ⋮ 자리(카드 위 4 + 44)와 겹치지 않게 */
export const side = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  justifyContent: 'flex-end',
  paddingTop: vars.space[6],
  gap: vars.space[2],
  flexShrink: 0,
});

export const price = style({
  margin: 0,
  ...textOf('labelLgEmphasized'),
  color: vars.color.text.primaryLabel,
  whiteSpace: 'nowrap',
  '@media': { [media.desktop]: textOf('headingMd2Emphasized') },
});

/** PC에서 칩을 large로(DS tag_v2 small 22 → large 25 · 좌우 12 · `Label/md`) */
export const chipLg = style({
  '@media': {
    [media.desktop]: {
      selectors: {
        '&&': { height: 25, padding: `0 ${vars.space[3]}`, ...textOf('labelMd') },
      },
    },
  },
});

/** ⋮ — 44 자리 가운데 16 아이콘(`910:3351`), 카드 오른쪽 위 */
export const menuButton = style({
  position: 'absolute',
  top: 0,
  right: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 44,
  height: 44,
  margin: vars.space[1],
  padding: 0,
  border: 'none',
  borderRadius: vars.radius[2],
  background: 'transparent',
  color: vars.color.text.primaryLabel,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: vars.color.interaction.disabledBg },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: -2 },
    '&:disabled': { cursor: 'not-allowed', color: vars.color.interaction.disabledText },
  },
});

export const options = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

/** [티켓 옵션 추가] — DS Button Secondary small(모바일 32) · PC medium(46, `910:3448`) */
export const addOption = style({
  '@media': {
    [media.desktop]: {
      selectors: {
        '&&': { height: 46, borderRadius: vars.radius[3], ...textOf('labelMdEmphasized') },
      },
    },
  },
});
