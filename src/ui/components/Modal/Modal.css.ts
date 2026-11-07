import { globalStyle, keyframes, style, styleVariants } from '@vanilla-extract/css';

import { media } from '../../theme/breakpoints';
import { vars } from '../../theme/tokens.css';

const fadeIn = keyframes({ from: { opacity: 0 } });
const fadeOut = keyframes({ to: { opacity: 0 } });
const popIn = keyframes({ from: { opacity: 0, transform: 'translate(-50%, -48%) scale(0.97)' } });
const popOut = keyframes({ to: { opacity: 0, transform: 'translate(-50%, -48%) scale(0.97)' } });

const reduced = '(prefers-reduced-motion: reduce)';

/**
 * 딤. 옛 GUI는 확인 모달 80%·티켓 시트 70%로 달랐다 — 2026-10-31 디자인 시스템에 딤 변수가 생겨 85% 하나로.
 * 색 토큰 `overlay.dim`(Figma `Background/dimmed` — Neutral 900 85%)을 쓴다.
 */
export const overlay = style({
  position: 'fixed',
  inset: 0,
  zIndex: vars.zIndex.modal,
  background: vars.color.overlay.dim,
  selectors: {
    '&[data-state="open"]': { animation: `${fadeIn} 200ms ease-out` },
    '&[data-state="closed"]': { animation: `${fadeOut} 150ms ease-in` },
  },
  '@media': { [reduced]: { animation: 'none !important' } },
});

/** 판 공통 — 가운데, 좌우 24 남김, 모서리 16. 배경 · 안쪽 · 묶음 간격 · 폭은 아래 변형 */
export const content = style({
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: vars.zIndex.modal,
  display: 'flex',
  flexDirection: 'column',
  width: `calc(100% - ${vars.space[5]} * 2)`,
  maxHeight: `calc(100dvh - ${vars.space[5]} * 2)`,
  borderRadius: vars.radius[5],
  color: vars.color.text.primary,
  outline: 'none',
  selectors: {
    '&[data-state="open"]': { animation: `${popIn} 200ms ease-out` },
    '&[data-state="closed"]': { animation: `${popOut} 150ms ease-in` },
  },
  '@media': { [reduced]: { animation: 'none !important' } },
});

/** 흰 판 · 안쪽 24 · 묶음(머리 · 본문 · 버튼) 사이 24 — GUI `1029:6888` · `956:3281` */
const sheetPanel = {
  gap: vars.space[5],
  padding: vars.space[5],
  background: vars.color.background.normal,
};

/** `md` — 최대 480(GUI 예매자 주문 상세 `1029:6888`, 2026-11-08) */
export const contentMedium = style({ ...sheetPanel, maxWidth: 480 });

/** `lg` — 520(GUI 호스팅 PC 티켓 옵션 모달 `956:3157` · `956:3281` · `956:5804` 등 13장) */
export const contentLarge = style({ ...sheetPanel, maxWidth: 520 });

/**
 * 확인 팝업 = 디자인 시스템 `다이얼로그`(`758:1714`, 2026-11-01): 310폭, 모서리 16, 안쪽 24(`Space/5`), 흰 판.
 * 글자 묶음(제목 → 본문 8)과 버튼 줄 사이 24 — 묶음 간격 8 + footer 위 16(본문이 있으면 설명 → 본문 8).
 */
export const contentPopup = style({
  gap: vars.space[2],
  padding: vars.space[5],
  background: vars.color.background.normal,
});

/**
 * 확인 팝업 폭 — 모바일은 늘 310, 데스크탑(1024~)은 화면대로(R1f — GUI 티켓 삭제 · 판매 중단 확인 `975:8593` 등 520,
 * 입장 취소 확인 `1030:9318` 480). FIGMA-CUSTOM: DS `다이얼로그`는 310 하나 — Ready 화면이 폭을 덮어썼다(2단계 후보)
 */
export const popupWidth = styleVariants({
  sm: { maxWidth: 310 },
  md: { maxWidth: 310, '@media': { [media.desktop]: { maxWidth: 480 } } },
  lg: { maxWidth: 310, '@media': { [media.desktop]: { maxWidth: 520 } } },
});

/**
 * 입금 확인 창(R1e — GUI `567:9756`, Ready `567:9468`): 342, 회색 판 `surface/container`, 안쪽 16, 간격 8, ✕,
 * 흰 카드 둘(본문) → 버튼 16. FIGMA-CUSTOM: DS `다이얼로그 - 결제 요약` 대신 화면이 직접 그린 판(2단계 후보)
 */
export const contentSummary = style({
  gap: vars.space[2],
  maxWidth: 342,
  padding: vars.space[4],
  background: vars.color.surface.container,
});

export const headGroup = style({ display: 'flex', flexDirection: 'column', flexShrink: 0 });

/** 제목 행 — 앞 슬롯 · 제목 · ✕, 간격 8, 세로 가운데(`1029:6892` 제목 행 · `956:5913` 머리) */
export const header = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.space[2],
});

export const headTitle = style({ flex: '1 1 auto', minWidth: 0 });

export const title = style({ margin: 0 });

/** 위 간격은 설명 글자 종류가 정한다(`theme/overlay-text`) */
export const description = style({
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  whiteSpace: 'pre-line',
});

export const body = style({
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflowY: 'auto',
});

export const footer = style({
  display: 'flex',
  flexShrink: 0,
  gap: vars.space[2],
});

/** 버튼은 같은 폭으로 나뉜다 */
globalStyle(`${footer} > *`, { flex: 1 });

/** 확인 팝업 — 설명 → 본문 16 = 간격 8 + 8(옛 값 그대로) */
globalStyle(`${contentPopup} > ${body}`, { marginTop: vars.space[2] });

/** 확인 팝업 — 글자(또는 본문) → 버튼 24 = 간격 8 + 16 */
globalStyle(`${contentPopup} > ${footer}`, { marginTop: vars.space[4] });

/** 입금 확인 창 — 카드 → 버튼 16 = 간격 8 + 8(`567:9756` 카드 · 버튼 묶음 간격 16) */
globalStyle(`${contentSummary} > ${footer}`, { marginTop: vars.space[2] });

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
});

export const headerEnd = style({ display: 'flex', justifyContent: 'flex-end' });
