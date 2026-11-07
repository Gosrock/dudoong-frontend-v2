import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/**
 * 선물 상태 아이콘 16(GUI `1190:10669` 선물 대기 · `1190:10676` 선물 받음 — 16×16).
 * DS `ic_gift_waiting` · `ic_gift_done`은 24 변형만 있고 GUI 인스턴스가 16으로 줄여 쓴다 — 코드도 24 그림을 16으로 그린다
 */
export const giftIcon = style({
  display: 'inline-flex',
  flex: '0 0 auto',
  width: 16,
  height: 16,
});

globalStyle(`${giftIcon} > svg`, { width: 16, height: 16 });

/** 아이콘 색은 currentColor — 선물 대기 회색(DS 원본 neutral 300 = text tertiary) · 선물 받음 진한 글자색(DS 원본 #141413 = text primary) */
export const pending = style({ color: vars.color.text.tertiary });
export const accepted = style({ color: vars.color.text.primary });
