import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { colors } from '@/ui/theme/colors';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 노란 안내 상자 — GUI "티켓 옵션이란?"(`793:11743` 342×40 · PC `821:23557` 내용 폭), 옵션 가이드 "판매가 시작되면…"(`924:1334`),
 * 잠긴 옵션 수정 안내(`933:2015`). 패딩 8 · 간격 4 · 모서리 8 · 채움 Yellow/50(의미 변수 없음 — 원시 색)
 */
export const notice = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[1],
  width: '100%',
  padding: vars.space[2],
  border: 'none',
  borderRadius: vars.radius[2],
  background: colors.yellow50,
  color: vars.color.text.primaryLabel,
  textAlign: 'left',
});

export const noticeButton = style([
  notice,
  {
    cursor: 'pointer',
    selectors: {
      '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
    },
  },
]);

/** PC 목록 머리의 "티켓 옵션이란?"은 내용 폭(오른쪽 12) */
export const noticeInline = style({
  '@media': {
    [media.desktop]: { width: 'auto', alignSelf: 'flex-start', paddingRight: vars.space[3] },
  },
});

/**
 * 옵션 행 — GUI 로컬 컴포넌트 `티켓 옵션 행`(`915:*`, 상태 기본 = ✕ · 판매 발생 = ›): 흰 배경 · 테두리 `surface/default-border` ·
 * 모서리 8 · 패딩 8 8 8 12 · 간격 8. 이름 `Body/md` + 칩(응답 형식 grey weak round · 추가금 violet fill round)
 */
export const optionRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
  width: '100%',
  minHeight: 64,
  padding: `${vars.space[2]} ${vars.space[2]} ${vars.space[2]} ${vars.space[3]}`,
  border: `1px solid ${vars.color.surface.defaultBorder}`,
  borderRadius: vars.radius[2],
  background: vars.color.background.normal,
  color: vars.color.text.primaryLabel,
  textAlign: 'left',
});

/** 행 전체가 버튼(상세 열기) */
export const optionRowButton = style([
  optionRow,
  {
    cursor: 'pointer',
    selectors: {
      '&:hover': { background: vars.color.surface.container },
      '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
    },
  },
]);

export const optionRowBody = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  flex: '1 1 auto',
  minWidth: 0,
  border: 'none',
  padding: 0,
  background: 'transparent',
  color: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
});

export const optionName = style({ overflowWrap: 'anywhere' });

/** 오른쪽 24 자리(› · ✕) */
export const optionTrail = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 24,
  height: 24,
  padding: 0,
  border: 'none',
  borderRadius: vars.radius[1],
  background: 'transparent',
  color: vars.color.text.primaryLabel,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: vars.color.surface.container },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 1 },
    '&:disabled': { cursor: 'not-allowed', color: vars.color.interaction.disabledText },
  },
});

export const chips = style({ display: 'flex', flexWrap: 'wrap', gap: vars.space[1] });

/** 칸 묶음 사이(옵션 시트·가이드) */
export const stack = style({ display: 'flex', flexDirection: 'column', gap: vars.space[2] });

export const preLine = style({ whiteSpace: 'pre-line' });

/** 가이드 본문 목록(• 세 줄) */
export const bullets = style({
  margin: 0,
  paddingLeft: vars.space[5],
  listStyle: 'disc',
});

/** 토글 칸 — 제목·안내(왼쪽, 간격 4) | 토글(오른쪽), 위아래 16 · 간격 16(GUI `767:46736`), 아래 내용(금액 칸 등)은 위 10(→ 8) */
export const toggleSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  padding: `${vars.space[4]} 0`,
});

export const toggleHead = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.space[4],
});

export const toggleText = style({ display: 'flex', flexDirection: 'column', gap: vars.space[1] });

export const toggleTitle = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[1],
  margin: 0,
});

export const infoButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  padding: 0,
  border: 'none',
  borderRadius: vars.radius.full,
  background: 'transparent',
  color: vars.color.text.primaryLabel,
  cursor: 'pointer',
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 1 },
  },
});

/** 비활성 칸 묶음(잠긴 옵션의 형식·가격 — GUI `933:2015` 흐린 제목) */
export const dimmed = style({ opacity: 0.4 });
