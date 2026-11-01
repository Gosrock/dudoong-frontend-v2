import { style } from '@vanilla-extract/css';

import { FULL_SCREEN_MIN_HEIGHT } from '@/ui/theme/bars';

/** 게이트의 대기·재시도 화면은 화면 높이를 채운다(셸 안이면 고정 바 자리를 뺀 높이 — 이슈 #95) */
export const fullScreen = style({ minHeight: FULL_SCREEN_MIN_HEIGHT });
