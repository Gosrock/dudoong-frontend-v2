import { globalStyle, style } from '@vanilla-extract/css';

import { media } from '../../theme/breakpoints';
import { vars } from '../../theme/tokens.css';
import { typography, typographySpecs } from '../../theme/typography.css';

const size = (k: keyof typeof typographySpecs) => ({
  fontSize: typographySpecs[k].size,
  fontWeight: typographySpecs[k].weight,
});

/**
 * 디자인 시스템 `승인 메뉴_mobile`(`605:1665`) ↔ `승인 메뉴_desktop`(`538:2562`). 같은 DOM을 CSS가 바꾼다(반응형 규칙 — patterns §1).
 * - 모바일: 가로 — 아이콘 36 + 간격 8 + 라벨 `Label/sm` · 숫자 `Heading/md2 - emphasized`, 패딩 12, 높이 61, ↗ 없음
 * - PC: 세로 — 아이콘 36(위) · 간격 20 · 라벨 `Label/md` `text/secondary-label` · 숫자 `Heading/md - emphasized`, 오른쪽 위 ↗ 24,
 *   패딩 16 · 16 · 12(GUI 인스턴스 `712:1701`의 위 16 덮어쓰기 — DS 기본 12)
 * 배경 #F7F7F6(`surface.container`), 모서리 20.
 */
export const card = style({
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
    // hover·pressed는 Figma에 없다 — 같은 회색 계열 한 단계(interaction.disabledBg = Neutral 100)
    '&:hover': { background: vars.color.interaction.disabledBg },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
  '@media': {
    [media.desktop]: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      // 아이콘 ↔ 글자 사이 20 → 24(토큰)
      gap: vars.space[5],
      padding: `${vars.space[4]} ${vars.space[4]} ${vars.space[3]}`,
    },
  },
});

export const icon = style({ display: 'inline-flex', flexShrink: 0, width: 36, height: 36 });

export const text = style({ display: 'flex', flexDirection: 'column', minWidth: 0 });

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

/** ↗ — PC만, 오른쪽 위 패딩 안쪽 */
export const arrow = style({
  display: 'none',
  '@media': {
    [media.desktop]: {
      display: 'inline-flex',
      position: 'absolute',
      top: vars.space[4],
      right: vars.space[4],
    },
  },
});
globalStyle(`${arrow} > svg`, { width: 24, height: 24 });
