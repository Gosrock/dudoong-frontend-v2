import { globalStyle, style, styleVariants } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';

const reduced = '(prefers-reduced-motion: reduce)';

/** 딤 — Modal과 같은 값(`Background/dimmed` 85%). 등장·퇴장 애니메이션은 vaul 기본 css가 준다 */
export const overlay = style({
  position: 'fixed',
  inset: 0,
  zIndex: vars.zIndex.sheet,
  background: vars.color.overlay.dim,
  '@media': { [reduced]: { animation: 'none !important' } },
});

/**
 * 시트 판 — 390폭(최대 600), 흰 배경. 높이는 내용에 맞춘다(v1 `snapPoints minHeight` 대응 — snapPoints 없음).
 * 테두리 · 그림자 · 모서리는 `contentVariant`.
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
  outline: 'none',
  '@media': { [reduced]: { animation: 'none !important', transition: 'none !important' } },
});

const raisedSurface = {
  borderTop: `1px solid ${vars.color.surface.defaultBorder}`,
  boxShadow: `0 -4px 6px ${vars.color.overlay.shadow}`,
};

/**
 * - default — 옛 GUI `331:5853`·`324:4503`(지금은 파일에서 지워짐): 위 테두리 + 위로 그림자, 모서리 0
 * - flat — 호스팅 시트(`994:1154` · `931:1314` · `1023:4560` 등): 위 두 모서리 16(`Radius/5`), 테두리 · 그림자 없음
 * - raised — 선물 확인 시트(`908:12096` 등): 위 테두리 1 `#dddcda` + 그림자 y −4 · blur 6 · 15%, 모서리 0
 */
export const contentVariant = styleVariants({
  default: raisedSurface,
  flat: {
    borderTopLeftRadius: vars.radius[5],
    borderTopRightRadius: vars.radius[5],
  },
  raised: raisedSurface,
});

/** 막대 손잡이 줄 — flat 위 12(`994:1154` 안쪽 위 12), raised 위 16(`908:21340` 안쪽 4 + 묶음 12) */
export const barRow = styleVariants({
  default: {},
  flat: { display: 'flex', justifyContent: 'center', flexShrink: 0, paddingTop: vars.space[3] },
  raised: { display: 'flex', justifyContent: 'center', flexShrink: 0, paddingTop: vars.space[4] },
});

/** 막대 손잡이(장식) — 40×4 · 모서리 2 · `surface/default-border`(GUI `Handle`) */
export const bar = style({
  display: 'block',
  width: 40,
  height: 4,
  borderRadius: 2,
  background: vars.color.surface.defaultBorder,
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

/** 위 간격은 설명 글자 종류가 정한다(`theme/overlay-text`) */
export const description = style({
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  whiteSpace: 'pre-line',
});

/** 막대 손잡이 시트의 머리 — 손잡이 아래 24, 좌우 24 */
export const headerVariant = styleVariants({
  default: {},
  flat: { flexShrink: 0, padding: `0 ${vars.space[5]}`, marginTop: vars.space[5] },
  raised: { flexShrink: 0, padding: `0 ${vars.space[5]}`, marginTop: vars.space[5] },
});

/** raised(선물 확인 시트)는 제목 · 설명 가운데(`908:12096`) */
export const headerAlign = styleVariants({
  default: {},
  flat: {},
  raised: { textAlign: 'center' },
});

/** 제목 행 — 앞 슬롯 · 제목 · ✕, 간격 8, 세로 가운데(`994:1162` · `943:2221`) */
export const headRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.space[2],
});

export const headTitle = style({ flex: '1 1 auto', minWidth: 0 });

/** ✕ — `ic/close` 24 */
export const closeButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 24,
  height: 24,
  padding: 0,
  border: 0,
  background: 'transparent',
  color: vars.color.text.primary,
  cursor: 'pointer',
  borderRadius: vars.radius[1],
  selectors: { '&:disabled': { cursor: 'not-allowed', opacity: 0.4 } },
});

export const body = style({
  flex: '1 1 auto',
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  padding: `${vars.space[2]} ${vars.space[5]} ${vars.space[4]}`,
});

/** 막대 손잡이 시트의 본문 — 위 묶음과 24, 좌우 24(위아래 안쪽 없음) */
export const bodyVariant = styleVariants({
  default: {},
  flat: { padding: `0 ${vars.space[5]}`, marginTop: vars.space[5] },
  raised: { padding: `0 ${vars.space[5]}`, marginTop: vars.space[5] },
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

/**
 * 막대 손잡이 시트의 버튼 줄 — 위 구분선 없음(`994:1154` · `908:12096`), 아래 16 + 안전 영역(시트 아래 32/34는 확인 필요 O12).
 * flat은 본문과 24, raised는 글자와 20(묶음 안 12 + 간격 8 — `908:21340`) · 버튼 사이 12(`939:26914`)
 */
export const footerVariant = styleVariants({
  default: {},
  flat: {
    marginTop: vars.space[5],
    paddingTop: 0,
    borderTop: 'none',
  },
  raised: {
    marginTop: `calc(${vars.space[3]} + ${vars.space[2]})`,
    paddingTop: 0,
    borderTop: 'none',
    gap: vars.space[3],
  },
});

/** 버튼 영역이 없을 때 본문 아래 안전 영역 */
export const bodyLast = style({
  paddingBottom: `calc(${vars.space[4]} + env(safe-area-inset-bottom))`,
});
