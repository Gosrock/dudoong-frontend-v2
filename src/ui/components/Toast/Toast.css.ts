import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/**
 * Figma Toast popup `303:2665` — 358×54, 모서리 12(Space/3 → radius 4), 안쪽 16, 흰 배경,
 * 테두리 1px(Neutral 400 = surface.strongBorder), 그림자 drop, Body/lg 가운데 정렬. 아이콘·액션 없음.
 */
export const toast = style([
  typography.bodyLg,
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 54,
    padding: vars.space[4],
    borderRadius: vars.radius[4],
    border: `1px solid ${vars.color.surface.strongBorder}`,
    background: vars.color.background.normal,
    color: vars.color.text.primary,
    boxShadow: vars.shadow.drop,
    textAlign: 'center',
  },
]);

export const title = style({ width: '100%' });
