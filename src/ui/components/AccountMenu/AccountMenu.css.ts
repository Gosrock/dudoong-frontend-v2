import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/**
 * 디자인 시스템 `My`(`585:752`) — 폭 263, 패딩 20, 구획 간격 12, 모서리 20(`161:3481` = `radius[6]`),
 * 흰 배경, 그림자 `drop shadow2`. 구획 사이 선 `surface/default-border`(#DDDCDA).
 */
export const content = style({
  zIndex: vars.zIndex.popover,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  width: 263,
  maxHeight: 'var(--radix-dropdown-menu-content-available-height)',
  overflowY: 'auto',
  // Figma 패딩 20은 Space 토큰이 없어 16(design-system §4 "토큰만 쓴다")
  padding: vars.space[4],
  boxSizing: 'border-box',
  background: vars.color.background.normal,
  color: vars.color.text.primaryLabel,
  borderRadius: vars.radius[6],
  boxShadow: vars.shadow.drop2,
  outline: 'none',
});

const divided = {
  borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
} as const;

/** 프로필 줄 — 위아래 12, Avatar 45 + 간격 22 + 닉네임·이메일. 누르면 프로필 편집 */
export const profile = style({
  ...divided,
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[5],
  padding: `${vars.space[3]} 0`,
  color: 'inherit',
  textDecoration: 'none',
  outline: 'none',
  cursor: 'pointer',
  selectors: {
    '&[data-highlighted]': { background: vars.color.surface.container },
  },
});

export const profileAvatar = style({ position: 'relative', flexShrink: 0, display: 'inline-flex' });

/** 아바타 오른쪽 아래 검정 원(20) 안의 연필 */
export const editBadge = style({
  position: 'absolute',
  right: `calc(${vars.space[1]} * -1)`,
  bottom: `calc(${vars.space[1]} * -1)`,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  height: 20,
  borderRadius: vars.radius.full,
  background: vars.color.background.darkFixed,
  color: vars.color.text.inverse,
});

export const editIcon = style({ width: 14, height: 14 });

export const profileText = style({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
});

/** 구획 — 위 4 · 아래 16, 줄 간격 12, 아래 선 */
export const section = style({
  ...divided,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  padding: `${vars.space[1]} 0 ${vars.space[4]}`,
});

/** 마지막 구획 — 위 12 · 아래 8, 선 없음 */
export const lastSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  padding: `${vars.space[3]} 0 ${vars.space[2]}`,
});

export const sectionTitle = style({ padding: 0 });

/** 항목 — 줄 높이 20(호스트 줄은 Avatar 24라 24), 아이콘 20 + 간격 14 + Label/md-emphasized. 14는 토큰이 없어 `space[3]` 12 */
export const item = style([
  typography.labelMdEmphasized,
  {
    display: 'flex',
    alignItems: 'center',
    gap: vars.space[3],
    minHeight: 20,
    color: vars.color.text.primaryLabel,
    textDecoration: 'none',
    borderRadius: vars.radius[1],
    outline: 'none',
    cursor: 'pointer',
    userSelect: 'none',
    selectors: {
      '&[data-highlighted]': { background: vars.color.surface.container },
      '&[data-disabled]': { color: vars.color.interaction.disabledText, cursor: 'not-allowed' },
    },
  },
]);

export const icon = style({ display: 'inline-flex', width: 20, height: 20, flexShrink: 0 });
globalStyle(`${icon} > svg`, { width: '100%', height: '100%' });

export const empty = style({ margin: 0 });

export const ellipsis = style({
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

/** 상단 바 오른쪽 아바타 ▾ — Avatar 32 + 간격 10 + 닉네임 + ▾ 12 */
export const trigger = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[2],
  maxWidth: 200,
  height: 40,
  padding: `0 ${vars.space[1]}`,
  border: 0,
  borderRadius: vars.radius.full,
  background: 'transparent',
  color: vars.color.text.primaryLabel,
  cursor: 'pointer',
  selectors: {
    '&:hover, &[data-state="open"]': { background: vars.color.surface.container },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: -2 },
  },
});

globalStyle(`${trigger} > img, ${trigger} > svg`, { flexShrink: 0 });
