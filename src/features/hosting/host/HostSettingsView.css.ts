import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';

/**
 * 호스트 홈 설정(GUI `1452:40541`) — 모바일은 상단 바 · 하단 [저장] 바가 화면 폭 가득이다(셸 본문 좌우 24를 되돌림 — ← 가 화면 끝에서 16,
 * [저장]은 좌우 24). PC는 그대로
 */
export const bleed = style({
  marginLeft: -24,
  marginRight: -24,
  '@media': { [media.desktop]: { marginLeft: 0, marginRight: 0 } },
});

/** 하단 바 자리 — 바(sticky)가 화면 아래에 붙도록 남은 높이 끝에 둔다 */
export const bottom = style([bleed, { position: 'sticky', bottom: 0, marginTop: 'auto' }]);
