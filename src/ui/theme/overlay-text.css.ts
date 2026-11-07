import { style } from '@vanilla-extract/css';

import { vars } from './tokens.css';

/** 오버레이 설명의 제목 아래 간격(`overlay-text.ts`) */
export const descriptionGap4 = style({ marginTop: vars.space[1] });
export const descriptionGap8 = style({ marginTop: vars.space[2] });
