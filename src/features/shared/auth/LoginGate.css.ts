import { style } from '@vanilla-extract/css';

/** 게이트의 대기·재시도 화면은 화면 높이를 채운다(셸 헤더 아래 본문 자리) */
export const fullScreen = style({ minHeight: '100dvh' });
