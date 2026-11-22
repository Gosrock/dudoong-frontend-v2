import { style } from '@vanilla-extract/css';

import { rowInlinePadding } from '@/ui/theme/row-inset.css';
import { vars } from '@/ui/theme/tokens.css';

/** 최종 결제정보 패널(GUI `1999:3013` — 테두리 `surface/default-border` · 모서리 16 · 안쪽 24 · 사이 24, 금액 줄은 좌우 0) */
export const amountPanel = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[5],
  padding: vars.space[5],
  border: `1px solid ${vars.color.surface.defaultBorder}`,
  borderRadius: vars.radius[5],
  background: vars.color.background.normal,
  vars: { [rowInlinePadding]: '0' },
});

/** 패널 제목 ↔ 금액 줄 8(GUI `1999:3014` 사이 8) */
export const panelTitle = style({ margin: 0, marginBottom: vars.space[2] });

/** 판매정보 패널(GUI `1999:3030` — 회색 판 · 모서리 16 · 안쪽 24) */
export const salePanel = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  padding: vars.space[5],
  borderRadius: vars.radius[5],
  background: vars.color.surface.container,
});

/** 머리 — "판매정보" + ⌃(누르면 접힘) */
export const saleHead = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: 0,
  border: 'none',
  background: 'none',
  color: vars.color.text.primary,
  textAlign: 'left',
  cursor: 'pointer',
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

export const chevron = style({
  display: 'inline-flex',
  transition: 'transform 150ms ease',
  selectors: { [`${saleHead}[data-state="open"] &`]: { transform: 'rotate(180deg)' } },
});

/** 펼친 내용 — 줄 사이 16(GUI `1999:3030` 사이 16) */
export const saleBody = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  selectors: { '&[hidden]': { display: 'none' } },
});

/** 동의 사이 구분선(GUI `1989:32212` 1px `surface/default-border`) */
export const rule = style({
  width: '100%',
  height: 1,
  margin: 0,
  border: 'none',
  background: vars.color.surface.defaultBorder,
});

/** 환불/취소 규정 묶음 — 제목 ↔ 내용 8 */
export const policy = style({ display: 'flex', flexDirection: 'column', gap: vars.space[2] });

export const policyTitle = style({ margin: 0, color: vars.color.text.primary });

/** 중개자 문장 · 링크 — 문장 ↔ 링크 8 */
export const notice = style({ display: 'flex', flexDirection: 'column', gap: vars.space[2] });
