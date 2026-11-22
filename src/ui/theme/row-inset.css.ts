import { createVar, fallbackVar } from '@vanilla-extract/css';

import { vars } from './tokens.css';

/**
 * 정보 줄(`InfoRow` · `Accordion` 트리거 — Figma `list`)의 좌우 안쪽 여백. 기본은 24(화면 폭 줄).
 * 줄이 카드 · 열 안에 들어가 좌우가 바깥 칸과 맞아야 하면(GUI `[WEB] 공연결제` `1999:2893` — list 좌우 0) 감싸는 요소에서
 * `vars: { [rowInlinePadding]: '0' }`으로 바꾼다
 */
export const rowInlinePadding = createVar();

export const rowInline = fallbackVar(rowInlinePadding, vars.space[5]);
