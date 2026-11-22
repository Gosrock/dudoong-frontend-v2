import { globalStyle, style } from '@vanilla-extract/css';

import { TOP_BAR_HEIGHT } from '@/ui/theme/bars';
import { rowInlinePadding } from '@/ui/theme/row-inset.css';
import { vars } from '@/ui/theme/tokens.css';

export const form = style({ flex: '1 0 auto', display: 'flex', flexDirection: 'column' });

/** PC 두 열(GUI `1999:2892` — 본문 1280 · 열 사이 24, 왼쪽 8열 845 · 오른쪽 4열 411) */
export const formDesktop = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 845fr) minmax(0, 411fr)',
  alignItems: 'start',
  gap: vars.space[5],
});

/** PC 왼쪽 열 — 묶음 사이 32(GUI `1999:2893`), 줄 좌우 0. 모바일의 회색 띠(`Divider section`)는 PC에 없다 */
export const mainColumn = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[6],
  minWidth: 0,
  vars: { [rowInlinePadding]: '0' },
});

globalStyle(
  `${mainColumn} > [data-variant="section"], ${mainColumn} section > [data-variant="section"]`,
  {
    display: 'none',
  },
);

/** PC 오른쪽 열 — 패널 사이 24, 스크롤해도 상단 바 아래에 붙어 있다(🤖 GUI는 정지 화면) */
export const sideColumn = style({
  position: 'sticky',
  top: `calc(${TOP_BAR_HEIGHT}px + ${vars.space[5]})`,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[5],
  minWidth: 0,
});

/** 필수 표시 `*`(빨강, 장식) */
export const requiredMark = style({ color: vars.color.text.dangerLabel });

/** 옵션 응답 영역(GUI `567:9738` 390 · 채움 `#F7F7F6` 변수 — 패딩 24 · 옵션 사이 선) */
export const optionBox = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  padding: `${vars.space[4]} ${vars.space[5]} ${vars.space[5]}`,
  background: vars.color.surface.container,
});

/** PC 옵션 상자는 안쪽 12(GUI `1999:2947`) */
globalStyle(`${mainColumn} ${optionBox}`, { padding: vars.space[3] });

export const errorBanner = style({
  margin: `${vars.space[3]} ${vars.space[5]} 0`,
  padding: `${vars.space[3]} ${vars.space[4]}`,
  borderRadius: vars.radius[2],
  background: vars.color.status.warningSubtle,
});

/**
 * 하단 동의 + CTA(GUI `1952:48455` — 위아래 16 · 좌우 24 · 사이 12). 화면 아래에 못박는다(fixed) — 디자이너 답 "고정형으로 적용"
 * (2026-11-22, Figma 코멘트 `564:4156` · design-requests Q62). 모바일만 — PC는 오른쪽 열 패널에 CTA가 있다(#363).
 */
export const bottomBar = style({
  position: 'fixed',
  insetInline: 0,
  bottom: 0,
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  padding: `${vars.space[4]} ${vars.space[5]}`,
  paddingBottom: `calc(${vars.space[4]} + env(safe-area-inset-bottom))`,
  background: vars.color.background.normal,
});

/**
 * 고정 바에 가리지 않게 폼 끝에 바 높이만큼 비운다 — 동의 줄 20 + 사이 12 + 버튼 56 + 위아래 16 · 16(+ 홈 인디케이터).
 * 동의 오류 줄이 붙으면 그만큼 더 길어지지만 그때는 오류 칸으로 스크롤한다
 */
export const bottomBarSpace = style({
  flexShrink: 0,
  height: `calc(${vars.space[4]} * 2 + ${vars.space[3]} + 76px + env(safe-area-inset-bottom))`,
});
