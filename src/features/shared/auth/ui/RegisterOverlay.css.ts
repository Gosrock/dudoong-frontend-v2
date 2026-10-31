import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 회원가입 오버레이 — 디자인 없음. 칸 사이 간격은 호스트 만들기 폼(와이어 `495:14815`)과 같은 값 */
export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[5],
});

export const consents = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  margin: 0,
  padding: 0,
  border: 'none',
  minWidth: 0,
});

export const legend = style({ padding: 0, marginBottom: vars.space[2] });

/** 약관 링크 — 글자색 그대로 밑줄만 */
export const link = style({
  color: 'inherit',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
});
