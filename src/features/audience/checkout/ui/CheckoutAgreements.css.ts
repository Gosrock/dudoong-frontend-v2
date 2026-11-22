import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 판매정보 ② 호스트 제공 동의 — 줄(DS list second-radio) + 회색 상자(GUI `1952:49359` · `1952:49360`) */
export const agreement = style({ display: 'flex', flexDirection: 'column' });

/** 줄 글자 — 앞 `*`(빨강)와 동의 문구. 문구는 눌러도 체크된다(`label`) */
export const requiredLabel = style({ cursor: 'pointer' });

/** 필수 표시 `*` — GUI `1952:49359` 글자 첫 자(빨강). 장식이라 읽지 않는다 */
export const requiredMark = style({ color: vars.color.text.dangerLabel });

/** 체크하지 않고 낼 때의 오류 — 줄과 같은 좌우 24 */
export const errorRow = style({ padding: `${vars.space[2]} ${vars.space[5]}` });

/** ③ 고지 목록 — 글머리 자리 */
export const noticeList = style({ margin: 0, paddingInlineStart: vars.space[5] });
