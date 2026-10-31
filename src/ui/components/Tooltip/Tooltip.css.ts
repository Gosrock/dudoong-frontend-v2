import { keyframes, style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

const fadeIn = keyframes({ from: { opacity: 0 } });

/**
 * GUI `331:11622` 말풍선 "두둥에서 공연을 시작해보세요!" — 흰 바탕, 옅은 회색 테두리, 왼쪽 꼬리, 한 줄 글자.
 * 테두리 #d9d9d9는 토큰이 아니어서 surface.defaultBorder로 옮겼다.
 */
export const content = style([
  typography.bodySm,
  {
    zIndex: vars.zIndex.popover,
    maxWidth: `min(280px, calc(100vw - ${vars.space[4]} * 2))`,
    padding: `${vars.space[2]} ${vars.space[3]}`,
    background: vars.color.background.normal,
    color: vars.color.text.primary,
    border: `1px solid ${vars.color.surface.defaultBorder}`,
    borderRadius: vars.radius[2],
    boxShadow: vars.shadow.drop,
    selectors: { '&[data-state$="open"]': { animation: `${fadeIn} 120ms ease-out` } },
    '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none !important' } },
  },
]);

export const arrow = style({ fill: vars.color.background.normal });
