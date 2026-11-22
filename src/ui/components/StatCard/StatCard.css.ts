import { globalStyle, style } from '@vanilla-extract/css';

import { media } from '../../theme/breakpoints';
import { cardHover } from '../../theme/card-hover.css';
import { vars } from '../../theme/tokens.css';
import { typography, typographySpecs } from '../../theme/typography.css';

const size = (k: keyof typeof typographySpecs) => ({
  fontSize: typographySpecs[k].size,
  fontWeight: typographySpecs[k].weight,
});

/**
 * 모바일 GUI `대시보드 모바일 버튼`(`1845:21576`) ↔ PC 디자인 시스템 `승인 메뉴_desktop`(`538:2562`, GUI `712:1646` 인스턴스).
 * 같은 DOM을 CSS가 바꾼다(반응형 규칙 — patterns §1). Design Sync #321 · #327 · #335(2026-11-21 — 토큰 값으로 정리).
 * - 모바일: 가로 — 아이콘 36 + 간격 8 + 라벨 `Label/sm` · 숫자 `Heading/md2 - emphasized` + 오른쪽 위 ↗ 18, 패딩 12, 높이 61
 * - PC: 세로 — 아이콘 36(위) · 간격 16 · 라벨 `Label/md` `text/secondary-label` · 숫자 `Heading/md - emphasized`, 오른쪽 위 ↗ 24,
 *   패딩 12 · 16(전에는 위 16 덮어쓰기 · 간격 20 — 2026-11-21 화면 값 12 · 16)
 * 배경 #F7F7F6(`surface.container`), 모서리 20. 호버 · 눌림은 #000000 5% 겹침(`cardHover`).
 */
export const card = style([
  cardHover,
  {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: vars.space[2],
    minWidth: 0,
    padding: vars.space[3],
    boxSizing: 'border-box',
    borderRadius: vars.radius[6],
    background: vars.color.surface.container,
    color: vars.color.text.primaryLabel,
    textDecoration: 'none',
    selectors: {
      '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
    },
    '@media': {
      [media.desktop]: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: vars.space[4],
        padding: `${vars.space[3]} ${vars.space[4]}`,
      },
    },
  },
]);

export const icon = style({ display: 'inline-flex', flexShrink: 0, width: 36, height: 36 });

export const text = style({
  display: 'flex',
  flexDirection: 'column',
  flex: '1 1 auto',
  minWidth: 0,
});

/** 라벨 — 모바일 `Label/sm` 검정 / PC `Label/md` 회색 */
export const label = style([
  typography.labelSm,
  {
    color: vars.color.text.primaryLabel,
    '@media': {
      [media.desktop]: { ...size('labelMd'), color: vars.color.text.secondaryLabel },
    },
  },
]);

/** 숫자 — 모바일 `Heading/md2 - emphasized`(18) / PC `Heading/md - emphasized`(20). 숫자도 Pretendard(Q14) */
export const count = style([
  typography.headingMd2Emphasized,
  { '@media': { [media.desktop]: size('headingMdEmphasized') } },
]);

/** 숫자 자리 스켈레톤 — 숫자 줄 높이(모바일 23 · PC 26) 안 48×22, 모서리 8 · #DDDCDA(GUI `1887:2127`) */
export const countSkeleton = style({
  display: 'flex',
  alignItems: 'center',
  height: 23,
  '@media': { [media.desktop]: { height: 26 } },
});
globalStyle(`${countSkeleton} > span`, { backgroundColor: vars.color.surface.defaultBorder });

/** ↗ — 모바일 18(줄 위쪽 — GUI `1845:21576` `이동`), PC 24(오른쪽 위 패딩 안쪽) */
export const arrow = style({
  display: 'inline-flex',
  flexShrink: 0,
  alignSelf: 'flex-start',
  '@media': {
    [media.desktop]: {
      position: 'absolute',
      top: vars.space[3],
      right: vars.space[4],
    },
  },
});
globalStyle(`${arrow} > svg`, { width: 18, height: 18 });
globalStyle(`${arrow} > svg`, { '@media': { [media.desktop]: { width: 24, height: 24 } } });
