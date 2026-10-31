import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography, typographySpecs } from '../../theme/typography.css';

/**
 * 선택 배경 — 디자인 시스템 `사이드바 메뉴` `true`(`91:912`)의 #F7F7F6 10%(변수 없음, design-system §3).
 * 같은 값을 공연 카드(GUI `Card list` `727:23220`)도 쓴다.
 */
export const sidebarTint = `color-mix(in srgb, ${vars.color.text.inverse} 10%, transparent)`;

/**
 * 디자인 시스템 `사이드바 메뉴`(`91:913`) 한 줄 — 47h, 패딩 12, 아이콘 20 + 간격 16, 글자 #F7F7F6 `Heading/md2`
 * (선택은 `- emphasized` + 배경 10% · 모서리 12). 검정 면(`background.dark`) 위에서만 쓴다.
 */
export const item = style([
  typography.headingMd2,
  {
    display: 'flex',
    alignItems: 'center',
    gap: vars.space[4],
    width: '100%',
    padding: vars.space[3],
    boxSizing: 'border-box',
    borderRadius: vars.radius[4],
    color: vars.color.text.inverse,
    textDecoration: 'none',
    selectors: {
      // hover는 Figma에 없다 — 선택 배경과 같은 값(근거 없는 새 값을 만들지 않는다, P11-V 결정)
      '&:hover, &[aria-current="page"]': { background: sidebarTint },
      '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
    },
  },
]);

globalStyle(`${item}[aria-current="page"]`, {
  fontWeight: typographySpecs.headingMd2Emphasized.weight,
});

/** 아이콘 24를 20으로(디자인 시스템도 24 아이콘을 20 칸에 놓았다) */
export const icon = style({ display: 'inline-flex', flexShrink: 0, width: 20, height: 20 });
globalStyle(`${icon} > svg`, { width: 20, height: 20 });

export const label = style({ flex: '1 1 auto', minWidth: 0 });
