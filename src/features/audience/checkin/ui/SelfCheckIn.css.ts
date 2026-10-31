import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/**
 * 셀프 체크인 — 디자인 없음(GUI·와이어에 관객 쪽 화면이 없다, 2026-11-01). 주문 완료(`OrderCompleteView`)처럼
 * 내용 묶음을 가운데 390폭 한 열로 둔다. PC도 같은 열(폰으로 QR을 찍어 여는 화면이라 PC는 드물다).
 */
export const page = style({
  flex: '1 0 auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: `${vars.space[7]} ${vars.space[5]}`,
});

export const content = style({
  width: '100%',
  maxWidth: 390,
});

/** 결과 아이콘 — DS 아이콘이 24뿐이라 키운다(크기는 Claude 판단) */
export const toneIcon = style({
  display: 'block',
  width: 56,
  height: 56,
});

/**
 * 결과 아래 티켓 정보 — DS list(`InfoRow`)는 좌우 패딩 24를 품은 390폭 행이라, 화면 여백(24)만큼 밖으로 내어 글자를
 * 버튼 끝과 맞춘다. EmptyState(가운데 정렬) 밖이라 행은 왼쪽 정렬 그대로
 */
export const ticket = style({
  marginLeft: `calc(-1 * ${vars.space[5]})`,
  marginRight: `calc(-1 * ${vars.space[5]})`,
});

/** 후보 한 장 — 라디오 옆 글자 두 줄 */
export const candidate = style({
  paddingTop: vars.space[2],
  paddingBottom: vars.space[2],
});
