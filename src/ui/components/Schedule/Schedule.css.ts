import { globalStyle, style, styleVariants } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';

// ─── `날짜`(`605:1875`) — 주간 줄 ──────────────────────────────────

/** "26년 10월" `Label/lg-emphasized` + 7칸(위아래 9 → 8). 칸 = 요일 `Label/sm` + 간격 8 + 날짜 `Label/md` */
export const week = style({ display: 'flex', flexDirection: 'column' });

export const days = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  margin: 0,
  padding: `${vars.space[2]} 0`,
  listStyle: 'none',
});

export const day = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.space[2],
  color: vars.color.text.tertiaryLabel,
});

/** 날짜 칸 — 원 20(오늘). 지난 날 회색 500 · 오늘 보라 원 + 흰 굵게 · 앞날 검정 굵게 */
export const date = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 20,
  height: 20,
  borderRadius: vars.radius.full,
});

export const dayState = styleVariants({
  past: {},
  today: { color: vars.color.brand.primary },
  future: {},
});

globalStyle(`${dayState.today} ${date}`, {
  background: vars.color.brand.primary,
  color: vars.color.text.inverse,
  fontWeight: 700,
});
globalStyle(`${dayState.future} ${date}`, {
  color: vars.color.text.primaryLabel,
  fontWeight: 700,
});

// ─── `일정`(`605:1848`) — 단계 한 칸 ──────────────────────────────

/** 모서리 12 · 패딩 12 · 체크 20 + 간격 12 + 제목 `Label/lg-emphasized` · 간격 3(→ 4) · 날짜 `Label/md` */
export const step = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'flex-start',
  gap: vars.space[3],
  padding: vars.space[3],
  boxSizing: 'border-box',
  borderRadius: vars.radius[4],
});

export const stepVariant = styleVariants({
  /** 지난 일정 — 배경 #F7F7F6 + 회색 체크 */
  past: { background: vars.color.surface.container },
  /** 현재 일정 — 배경 `brand/primary-subtle`, 보라 글자, 아래 64(→ 64) — 오른쪽 아래 일러스트 자리 */
  current: {
    background: vars.color.brand.primarySubtle,
    color: vars.color.brand.primary,
    paddingBottom: vars.space[9],
  },
  /** 미래 일정 — 흰 배경 + 테두리 Neutral 200 + 빈 체크 */
  upcoming: {
    background: vars.color.background.normal,
    boxShadow: `inset 0 0 0 1px ${vars.color.surface.defaultBorder}`,
  },
});

/** 체크 원 20 — 디자인 시스템 `Box`(round) 모양만(누를 수 없다) */
export const mark = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 20,
  height: 20,
  boxSizing: 'border-box',
  borderRadius: vars.radius.full,
  color: vars.color.text.inverse,
});

export const markVariant = styleVariants({
  past: { background: vars.color.surface.defaultBorder },
  current: { background: vars.color.brand.primary },
  upcoming: { border: `2px solid ${vars.color.surface.defaultBorder}` },
});

export const stepText = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  minWidth: 0,
});

/** `img_예매완료` 90 — 현재 일정 오른쪽 아래 */
export const stepIllustration = style({
  position: 'absolute',
  right: vars.space[3],
  bottom: vars.space[2],
  width: 90,
  height: 90,
  pointerEvents: 'none',
});
