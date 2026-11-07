import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/**
 * 선물 상태 아이콘 16(GUI `1190:10669` 선물 대기 · `1190:10676` 선물 받음 — 16×16).
 * 코드의 `gift` filled는 24만 있어 16으로 줄여 그린다(DS `ic_gift_waiting` · `ic_gift_done`이 `src/ui/icons`에 들어오면 지운다 — Q174)
 */
export const giftIcon = style({
  display: 'inline-flex',
  flex: '0 0 auto',
  width: 16,
  height: 16,
});

globalStyle(`${giftIcon} > svg`, { width: 16, height: 16 });

/** 선물 대기 — 회색(Figma neutral 300 = text tertiary) · 선물 받음 — 진한 글자색(neutral 800) */
export const pending = style({ color: vars.color.text.tertiary });
export const accepted = style({ color: vars.color.text.primary });
