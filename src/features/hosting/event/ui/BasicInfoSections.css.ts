import { globalStyle, style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 기본 정보 칸 묶음(`BasicInfoSections`) — 화면 틀은 `EventInfoView.css.ts`.
 * DS 컴포넌트(`Input` · `RadioGroup` · `DatePicker` …)에 붙이는 클래스는 `'&&'`로 세기를 올린다 — 화면을 나누면 이 CSS와 DS CSS가
 * 다른 청크가 되고 페이지의 `<link>` 순서가 import 순서를 따르지 않아, 같은 세기면 DS 기본값이 이긴다(티켓 폼 320 리플로가 그래서 깨졌었다).
 */

export const posterColumn = style({ minWidth: 0 });

/** 포스터 + 버튼 — 모바일 180 왼쪽 정렬, PC 두 열이면 270 가운데(GUI `748:34424` 270×381, 버튼 가운데, 안내 ↔ 포스터 ↔ 버튼 16) */
export const posterBody = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: vars.space[4],
  '@media': { [media.desktopS]: { alignItems: 'center' } },
});

export const poster = style({
  selectors: {
    '&&': {
      display: 'block',
      width: 180,
      aspectRatio: '180 / 255',
      height: 'auto',
      borderRadius: vars.radius[2],
      objectFit: 'cover',
      background: vars.color.surface.imageBg,
      // PC 270 폭은 모서리 15(GUI `748:34429` — 값 그대로)
      '@media': { [media.desktopS]: { width: 270, borderRadius: 15 } },
    },
  },
});

/** 모바일은 포스터 폭(180), PC는 글자 폭 */
export const posterButton = style({
  selectors: {
    '&&': {
      width: 180,
      '@media': { [media.desktopS]: { width: 'auto' } },
    },
  },
});

/**
 * 일정 — 모바일: 날짜 한 줄 + 시작 ~ 종료 한 줄 / PC: 날짜 · 시작 ~ 종료가 한 줄(GUI `748:34487` 600×44 —
 * 날짜 308(채움) · 간격 10 · 시각 묶음 282 = 시각 130 · 5 · "~" 12 · 5 · 130). 10 · 5 · 130은 토큰에 없는 값 그대로(분류표 H24, M-5 2026-11-08)
 */
export const schedule = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  '@media': { [media.desktop]: { flexDirection: 'row', alignItems: 'center', gap: 10 } },
});

export const date = style({ selectors: { '&&': { flex: '1 1 auto', minWidth: 0 } } });

export const times = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
  '@media': { [media.desktop]: { flex: '0 0 auto', gap: 5 } },
});

export const time = style({
  selectors: {
    '&&': {
      flex: '1 1 0',
      minWidth: 0,
      '@media': { [media.desktop]: { width: 130, flex: '0 0 auto' } },
    },
  },
});

/** "~" — PC 12 폭 가운데(GUI `748:34489`) */
export const tilde = style({
  '@media': { [media.desktop]: { width: 12, flex: '0 0 auto', textAlign: 'center' } },
});

/** 공연장 이름 · 상세주소 — 모바일 위아래, PC 한 줄 두 칸(GUI `748:34829`) */
export const placeRow = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  '@media': { [media.desktop]: { flexDirection: 'row' } },
});
globalStyle(`${placeRow} > *`, { flex: '1 1 0', minWidth: 0 });

export const iconButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: vars.color.text.secondaryLabel,
  cursor: 'pointer',
  borderRadius: vars.radius[1],
});
globalStyle(`${iconButton} > svg`, { width: 20, height: 20 });

/** 티켓 있음 · 없음 — 사이 34(GUI `748:33499` — 값 그대로) */
export const radios = style({ selectors: { '&&': { display: 'flex', gap: 34 } } });

/** 문의처 줄 — 유형 116 + 값 + ✕ 24(GUI `748:33512`, 간격 8) */
export const contactRow = style({ display: 'flex', alignItems: 'flex-start', gap: vars.space[2] });
export const contactType = style({ selectors: { '&&': { flex: '0 0 116px' } } });
export const contactValue = style({ selectors: { '&&': { flex: '1 1 auto', minWidth: 0 } } });
export const removeButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 24,
  height: 44,
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: vars.color.text.primaryLabel,
  cursor: 'pointer',
});

/** 태그 — 모바일 4열(GUI 78 고정 → 칸 나눔), PC 7열(GUI `748:34645` 600 안 7칸) */
export const tags = style({
  selectors: {
    '&&': {
      '@media': { [media.desktop]: { gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' } },
    },
  },
});

export const note = style({ margin: 0 });
