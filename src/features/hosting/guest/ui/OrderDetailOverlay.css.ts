import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 주문 상세 본문 — 섹션 사이 24(GUI `1029:6888` 간격 24) */
export const body = style({ display: 'flex', flexDirection: 'column', gap: vars.space[5] });

/** 섹션 — 제목 + 내용(간격 8) */
export const section = style({ display: 'flex', flexDirection: 'column', gap: vars.space[2] });

export const sectionTitle = style({ margin: 0 });

/** 제목 행 — 이름 + 칩(간격 8). 사유 단계는 ‹ + 문구 */
export const titleRow = style({
  display: 'inline-flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: vars.space[2],
});

export const backButton = style({
  display: 'inline-flex',
  padding: 0,
  border: 0,
  background: 'none',
  color: vars.color.text.primary,
  cursor: 'pointer',
  borderRadius: vars.radius[1],
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

/** 정보 줄 묶음(줄 사이 8) */
export const lines = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  margin: 0,
});

/** 정보 줄(GUI 로컬 `정보 줄` 형태=가로 — 라벨 80 · 간격 12) */
export const line = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  minHeight: 20,
});

export const lineLabel = style({ flex: '0 0 80px' });

export const lineValue = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.space[2],
  flex: '1 1 auto',
  minWidth: 0,
  margin: 0,
  overflowWrap: 'anywhere',
});

/** 티켓 카드 목록(간격 8) */
export const cards = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

/** 티켓 카드(GUI `1029:6909` — 테두리 `surface/default-border` · 모서리 8 · 안쪽 12 · 간격 8) */
export const card = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  padding: vars.space[3],
  border: `1px solid ${vars.color.surface.defaultBorder}`,
  borderRadius: vars.radius[2],
  background: vars.color.background.normal,
});

export const cardHead = style({ display: 'flex', alignItems: 'center', gap: vars.space[2] });

export const cardEnd = style({ marginLeft: 'auto', display: 'inline-flex' });

/** 옵션 응답(질문 · 응답 간격 2, 옵션 사이 8) */
export const answers = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  margin: 0,
});

export const answer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: `calc(${vars.space[1]} / 2)`,
});

export const plain = style({ margin: 0 });

export const alert = style({ margin: 0 });

export const errorBox = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.space[3],
  padding: vars.space[5],
});

/** 버튼 위 가운데 안내(GUI `1029:7706` "입장했거나 선물한 티켓이 있어 …") */
export const centerNote = style({ margin: 0, textAlign: 'center' });

/** 하단 버튼 — 같은 폭(간격 8) */
export const footer = style({ display: 'flex', gap: vars.space[2], width: '100%' });

export const footerStack = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[5],
  width: '100%',
});

/** 사유 라디오 묶음 + 기타 입력 */
export const reasonBlock = style({ display: 'flex', flexDirection: 'column', gap: vars.space[3] });

/** 사유 라디오 — 세로(간격 12, GUI 라디오 줄 32 간격) */
export const reasons = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: vars.space[3],
});

/** 기타 입력 — 라디오 글자 줄에 맞춰 28 들여쓰기(GUI `1029:7698`) */
export const reasonText = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  paddingLeft: `calc(${vars.space[5]} + ${vars.space[1]})`,
});

globalStyle(`${lineValue} > button`, { flexShrink: 0 });
