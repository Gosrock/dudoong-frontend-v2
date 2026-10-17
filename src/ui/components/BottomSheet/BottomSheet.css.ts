import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';

const reduced = '(prefers-reduced-motion: reduce)';

/** 딤 — Modal과 같은 값(70%). 등장·퇴장 애니메이션은 vaul 기본 css가 준다 */
export const overlay = style({
  position: 'fixed',
  inset: 0,
  zIndex: vars.zIndex.sheet,
  background: vars.color.overlay.dim,
  '@media': { [reduced]: { animation: 'none !important' } },
});

/**
 * GUI `331:5853`·`324:4503` — 390폭, 안쪽 4 · 24 · 16, 간격 8, 흰 배경, 위 테두리 + 위로 그림자.
 * Figma는 모서리가 0이다(그대로 따른다). 높이는 내용에 맞춘다(v1 `snapPoints minHeight` 대응 — snapPoints 없음).
 */
export const content = style({
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: vars.zIndex.sheet,
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  maxWidth: 600,
  marginLeft: 'auto',
  marginRight: 'auto',
  maxHeight: `calc(100dvh - ${vars.space[5]} * 2)`,
  background: vars.color.background.normal,
  color: vars.color.text.primary,
  borderTop: `1px solid ${vars.color.surface.defaultBorder}`,
  boxShadow: `0 -4px 6px ${vars.color.overlay.shadow}`,
  outline: 'none',
  '@media': { [reduced]: { animation: 'none !important', transition: 'none !important' } },
});

export const handleRow = style({
  display: 'flex',
  justifyContent: 'center',
  flexShrink: 0,
  paddingTop: vars.space[1],
});

/** 손잡이 — GUI는 회색 chevron-down 24. 누르면 닫힌다(끌어내리기는 시트 어디서나 된다) */
export const handle = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 44,
  height: 24,
  padding: 0,
  border: 0,
  background: 'transparent',
  color: vars.color.text.tertiary,
  cursor: 'pointer',
  borderRadius: vars.radius[1],
});

export const header = style({
  flexShrink: 0,
  paddingLeft: vars.space[5],
  paddingRight: vars.space[5],
  paddingTop: vars.space[2],
});

export const title = style({ margin: 0 });

export const description = style({ margin: 0, marginTop: vars.space[1], whiteSpace: 'pre-line' });

export const body = style({
  flex: '1 1 auto',
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  padding: `${vars.space[2]} ${vars.space[5]} ${vars.space[4]}`,
});

/** 하단 고정 버튼 영역. 본문만 스크롤되고 이 줄은 남는다. iOS 홈 인디케이터 영역만큼 띄운다 */
export const footer = style({
  flexShrink: 0,
  display: 'flex',
  gap: vars.space[2],
  padding: `${vars.space[2]} ${vars.space[5]} calc(${vars.space[4]} + env(safe-area-inset-bottom))`,
  borderTop: `1px solid ${vars.color.surface.defaultBorder}`,
  background: vars.color.background.normal,
});

/** 버튼은 같은 폭으로 나뉜다 */
globalStyle(`${footer} > *`, { flex: 1 });

/** 버튼 영역이 없을 때 본문 아래 안전 영역 */
export const bodyLast = style({
  paddingBottom: `calc(${vars.space[4]} + env(safe-area-inset-bottom))`,
});
