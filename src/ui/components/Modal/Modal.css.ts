import { globalStyle, keyframes, style } from '@vanilla-extract/css';

import { media } from '../../theme/breakpoints';
import { vars } from '../../theme/tokens.css';
import { typographySpecs } from '../../theme/typography.css';

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
 * 데스크탑(1024~)은 `다이얼로그_데스크탑`(`843:449`, 2026-11-08 #187): 420 · 안쪽 24 · 모서리 16 · 간격 8,
 * 제목 `Heading/md2 - emphasized` · 본문 `Body/md`, 본문 → 버튼 26(간격 8 + 빈 틀 10 + 8), 버튼은 글자 폭 · 오른쪽 정렬(아래 globalStyle).
 * 옛 R1f 폭(PC 520 · 480 — Ready `975:8593` · `1030:9318`)은 DS 데스크탑 세트로 바꿨다(관제탑 지시 "DS가 정본", 🤖 2026-11-08)
 */
export const contentPopup = style({
  gap: vars.space[2],
  maxWidth: 310,
  padding: vars.space[5],
  background: vars.color.background.normal,
  '@media': { [media.desktop]: { maxWidth: 420 } },
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

/**
 * 작은 팝업(`compact`) — GUI 호스트 홈 연락처 팝업(`1529:13695` — 342 · 흰 판 · 안쪽 24 · 모서리 16, 타이틀 → 값 8 · 값 → 버튼 24)과
 * 로그인 필요 PC(`1539:15046` — 모바일 다이얼로그 모양 그대로 342 + ✕). 모바일 · PC 같은 폭, ✕는 PC만(`closeCompact`).
 * 묶음 간격 8 + footer 위 16 = 24(확인 팝업과 같은 방식)
 */
export const contentCompact = style({
  gap: vars.space[2],
  maxWidth: 342,
  padding: vars.space[5],
  background: vars.color.background.normal,
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

/**
 * 제목 · 설명 칸은 flex — 안쪽 `Txt`(span)만 줄 높이를 정한다. 블록이면 h2(24px) · p(16px)의 기본 글자가 줄 상자를 키워
 * 확인 팝업이 Figma보다 커졌다(모바일 172 ↔ `758:1714` 160, 데스크탑 175.5 ↔ `843:440` 170 — 2026-11-08 #187)
 */
export const title = style({ display: 'flex', margin: 0 });

/** 제목 가운데(연락처 팝업 `1529:13695`) */
export const titleCenter = style({ justifyContent: 'center', textAlign: 'center' });

/** 위 간격은 설명 글자 종류가 정한다(`theme/overlay-text`) */
export const description = style({
  display: 'flex',
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

/** 확인 팝업 — 글자(또는 본문) → 버튼 24 = 간격 8 + 16. 데스크탑은 26 = 간격 8 + 18(`843:368` 빈 틀 10 + 간격 8) */
globalStyle(`${contentPopup} > ${footer}`, {
  marginTop: vars.space[4],
  '@media': { [media.desktop]: { marginTop: 18, justifyContent: 'flex-end' } },
});

/** 데스크탑 확인 팝업 버튼은 글자 폭(Button min width 69) — `843:370` · `843:371` HUG */
globalStyle(`${contentPopup} > ${footer} > *`, {
  '@media': { [media.desktop]: { flex: '0 0 auto' } },
});

const desktopText = (spec: (typeof typographySpecs)[keyof typeof typographySpecs]) => ({
  fontFamily: vars.font[spec.font],
  fontSize: spec.size,
  fontWeight: spec.weight,
  lineHeight: spec.lineHeight,
  letterSpacing: spec.letterSpacing,
});

/** 데스크탑 확인 팝업 제목 `Heading/md2 - emphasized` 18/700(`843:366`) — 모바일은 `Heading/sm - emphasized` */
globalStyle(`${contentPopup} ${title} > *`, {
  '@media': { [media.desktop]: desktopText(typographySpecs.headingMd2Emphasized) },
});

/**
 * 데스크탑 확인 팝업 본문 `Body/md` 14/400(`843:367`). 색은 Figma가 변수 없이 #73726E — 가장 가까운 의미 색인
 * 모바일 다이얼로그 본문 색 `text/secondary-label`을 그대로 둔다(🤖 2026-11-08, Figma 코멘트)
 */
globalStyle(`${contentPopup} ${description} > *`, {
  '@media': { [media.desktop]: desktopText(typographySpecs.bodyMd) },
});

/** 작은 팝업 — 글자 묶음 → 버튼 24 = 간격 8 + 16 */
globalStyle(`${contentCompact} > ${footer}`, { marginTop: vars.space[4] });

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

/**
 * 작은 팝업의 ✕ — PC(1024~)에서만, 판 오른쪽 위(✕ 24가 위 23 · 오른쪽 20 — GUI `1537:15088` · `1539:15047`).
 * 글자 흐름 밖에 떠서 가운데 제목을 밀지 않는다. 모바일은 ✕ 없이 버튼 · 바깥 · 뒤로가기로 닫는다(`1529:13696`)
 */
export const closeCompact = style({
  position: 'absolute',
  top: 23,
  right: 20,
  display: 'none',
  '@media': { [media.desktop]: { display: 'inline-flex' } },
});
