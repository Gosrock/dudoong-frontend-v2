import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/**
 * 디자인 시스템 `Top bar_Host`(`538:4262`) — 1440×58, 좌우 24, 양끝 정렬, 흰 배경(`606:1921`),
 * 아래 선 1px #F7F7F6(`120:982` — Neutral 50 = `surface.container`).
 */
export const root = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.space[5],
  width: '100%',
  height: 58,
  padding: `0 ${vars.space[5]}`,
  boxSizing: 'border-box',
  background: vars.color.background.normal,
  borderBottom: `1px solid ${vars.color.surface.container}`,
  color: vars.color.text.primaryLabel,
});

/** 로고 칸 + 글자 메뉴, 간격 24 */
export const start = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[5],
  height: '100%',
  minWidth: 0,
});

/** 로고 칸 — Figma 86×50 안에 75×40 로고(좌우 약 5). 누르는 영역을 칸 크기로 둔다 */
export const logo = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 50,
  padding: `0 ${vars.space[1]}`,
  color: vars.color.text.primaryLabel,
  borderRadius: vars.radius[2],
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

export const nav = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[5],
  height: '100%',
});

/** 메뉴 칸 높이 58(바 전체), 글자 Heading/sm-emphasized. 지금 있는 곳은 `text/primary-label`, 나머지는 `text/tertiary-label` */
export const navLink = style([
  typography.headingSmEmphasized,
  {
    display: 'inline-flex',
    alignItems: 'center',
    height: '100%',
    whiteSpace: 'nowrap',
    color: vars.color.text.tertiaryLabel,
    textDecoration: 'none',
    selectors: {
      '&[aria-current="page"]': { color: vars.color.text.primaryLabel },
      '&:hover': { color: vars.color.text.primaryLabel },
      '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: -2 },
    },
  },
]);

/** 오른쪽 — 벨(40) + 간격 20 + 아바타 ▾. 20은 Space 토큰이 없어 `space[4]` 16 + 아이콘 칸 여백으로 맞춘다 */
export const end = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[4],
  flexShrink: 0,
});

export const iconButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  width: 40,
  height: 40,
  padding: 0,
  border: 0,
  borderRadius: vars.radius.full,
  background: 'transparent',
  color: vars.color.text.primaryLabel,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: vars.color.surface.container },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: -2 },
  },
});

/** `plainNav` — 지금 있는 곳 표시 없이 모두 검정 */
globalStyle(`${nav}[data-plain] ${navLink}`, { color: vars.color.text.primaryLabel });
