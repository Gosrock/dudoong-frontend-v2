import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 선물 결과·상태 화면 틀 — GUI `908:13105` 링크 생성 완료 · `908:21359` 취소 완료 · `908:23165` 반송 완료 ·
 * `939:26992` 거절 완료 · `939:27058` 취소된 선물 · `939:26412` 비로그인(390). 내용 묶음(342폭)을 셸 헤더 아래 가운데쯤에 둔다.
 * PC(1024~)는 같은 묶음을 가운데 390폭으로(디자인 없음 — 주문 완료와 같은 방식).
 */
export const page = style({
  flex: '1 0 auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  padding: `${vars.space[8]} ${vars.space[5]}`,
  '@media': { [media.desktop]: { justifyContent: 'flex-start', paddingTop: vars.space[10] } },
});

export const content = style({
  width: '100%',
  maxWidth: 342,
});

/** 버튼 줄 — 하나면 꽉 차게, 둘이면 같은 폭 간격 12(GUI 165 · 165) */
export const actions = style({
  display: 'grid',
  gridAutoFlow: 'column',
  gridAutoColumns: '1fr',
  gap: vars.space[3],
  width: '100%',
});
