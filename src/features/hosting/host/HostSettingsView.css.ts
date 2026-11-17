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

/**
 * PC 본문 — 가운데 960(GUI `1496:12747` 안쪽 240 · `1496:12748` 960, Design Sync #294). 제목 줄(DS Top app bar)도 이 칸 안이다.
 * 1024~1279는 셸 여백 안에서 줄어든다
 */
export const column = style({
  '@media': {
    [media.desktop]: { width: '100%', maxWidth: 960, marginLeft: 'auto', marginRight: 'auto' },
  },
});

/** PC 폼 — 칸이 960 가득(`1496:12758` 960). 모바일은 그대로 */
export const form = style({
  '@media': { [media.desktop]: { selectors: { '&&': { maxWidth: 'none' } } } },
});

/** PC 연락처 — 유형 116 + 값 358(`1496:12771`)에 ✕ 자리 52를 더한 폭에서 멈춘다(🤖 — Figma는 한 줄이라 ✕가 없다) */
export const contacts = style({
  '@media': { [media.desktop]: { maxWidth: 116 + 8 + 358 + 8 + 44 } },
});

/** 하단 바 자리 — 바(sticky)가 화면 아래에 붙도록 남은 높이 끝에 둔다 */
export const bottom = style([bleed, { position: 'sticky', bottom: 0, marginTop: 'auto' }]);
