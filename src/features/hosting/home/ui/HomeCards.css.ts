import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/**
 * 공연준비 홈 카드(와이어 `424:11664` 공연 · `424:9715` 호스트 — 회색 상자 + 포스터/아바타 + 글자).
 * 와이어 수준(design-workflow §3): 배경 `surface/container`, 모서리 16(DS Card list `Space/4`와 같은 값), 안쪽 16, 간격 16.
 * 카드 전체를 누르면 이동한다 — 제목 링크의 `::after`가 카드를 덮는다(⋮ 버튼은 그 위).
 */
export const list = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

export const card = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'flex-start',
  gap: vars.space[4],
  padding: vars.space[4],
  borderRadius: vars.radius[5],
  background: vars.color.surface.container,
  selectors: {
    '&:has(a:focus-visible)': {
      outline: `2px solid ${vars.color.brand.primary}`,
      outlineOffset: 2,
    },
  },
});

export const hostCard = style([card, { alignItems: 'center' }]);

/** DS `example poster` mobile 94×133 */
export const poster = style({
  flexShrink: 0,
  width: 94,
  height: 133,
  borderRadius: vars.radius[2],
  objectFit: 'cover',
  background: vars.color.surface.imageBg,
});

export const body = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  flex: 1,
  minWidth: 0,
});

export const titleLink = style({
  color: 'inherit',
  textDecoration: 'none',
  outline: 'none',
  '::after': { content: '""', position: 'absolute', inset: 0, borderRadius: 'inherit' },
});

/** ⋮ — 카드 링크(`::after`) 위에 */
export const menuButton = style({
  position: 'relative',
  zIndex: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 32,
  height: 32,
  marginTop: `calc(${vars.space[1]} * -1)`,
  marginRight: `calc(${vars.space[2]} * -1)`,
  padding: 0,
  border: 'none',
  borderRadius: vars.radius.full,
  background: 'transparent',
  color: vars.color.text.primaryLabel,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: vars.color.background.grey },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}` },
  },
});

export const chipRow = style({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: vars.space[2],
  minHeight: 25,
});

export const role = style({ flexShrink: 0 });
