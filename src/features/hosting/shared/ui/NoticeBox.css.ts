import { globalStyle, style } from '@vanilla-extract/css';

import { colors } from '@/ui/theme/colors';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 노란 안내 상자 — GUI "티켓 옵션이란?"(`793:11743` 342×40 · PC `821:23557` 내용 폭), 옵션 가이드 "판매가 시작되면…"(`924:1334`),
 * 잠긴 옵션 수정 안내(`933:2015`). 패딩 8 · 간격 4 · 모서리 8 · 채움 Yellow/50(의미 변수 없음 — 원시 색)
 */
export const notice = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[1],
  width: '100%',
  padding: vars.space[2],
  border: 'none',
  borderRadius: vars.radius[2],
  background: colors.yellow50,
  color: vars.color.text.primaryLabel,
  textAlign: 'left',
});

/** 여러 줄 안내(환불 의무 — #840 ④)에서도 아이콘이 줄지 않게 */
globalStyle(`${notice} > svg`, { flexShrink: 0 });

export const noticeButton = style([
  notice,
  {
    cursor: 'pointer',
  },
]);
