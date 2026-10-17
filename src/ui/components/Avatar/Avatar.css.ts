import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';

/** 캐릭터 SVG는 원형 배경까지 그려져 있다. 사진은 원형으로 잘라 채운다(디자인 미정 — design-system §3 Avatar) */
export const avatar = style({
  display: 'block',
  flexShrink: 0,
  borderRadius: vars.radius.full,
  objectFit: 'cover',
  background: vars.color.background.grey,
});
