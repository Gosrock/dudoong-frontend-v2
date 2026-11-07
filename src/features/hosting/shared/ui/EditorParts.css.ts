import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 칸 묶음 — 위아래 16, 제목 ↔ 칸 10(입력 칸 — GUI 기본 정보 `748:34476` · `748:35283`, 새 티켓 `767:46584`) ·
 * `loose`면 16(라디오 줄 · 포스터 — `748:34539` · `748:34424` · `767:46572`). 10은 토큰에 없는 값 그대로(분류표 H2, M-4 2026-11-08)
 */
export const section = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: `${vars.space[4]} 0`,
  selectors: { '&[data-loose]': { gap: vars.space[4] } },
});

export const preLine = style({ whiteSpace: 'pre-line' });

export const fieldError = style({ margin: 0 });

/**
 * 하단 고정 바 — 화면(가운데 영역) 아래에 붙는다. 모바일 위아래 36 · 좌우 24(GUI 기본 정보 `748:33447` · `748:33553`, 상세 정보
 * `767:39603` — 36은 토큰에 없는 값 그대로, 분류표 H25 M-5 2026-11-08), PC 24 · 위 테두리(`748:34686` · `767:40055`)
 */
export const bottomBar = style({
  position: 'sticky',
  bottom: 0,
  zIndex: 1,
  marginTop: 'auto',
  background: vars.color.background.normal,
  padding: `36px ${vars.space[5]}`,
  paddingBottom: 'calc(36px + env(safe-area-inset-bottom))',
  '@media': {
    [media.desktop]: {
      padding: vars.space[5],
      borderTop: `1px solid ${vars.color.surface.defaultBorder}`,
    },
  },
});

export const bottomInner = style({
  display: 'flex',
  gap: vars.space[2],
  '@media': { [media.desktop]: { justifyContent: 'flex-end' } },
});

/** 모바일 Large 56 · PC medium 46 — 같은 DOM, 높이·모서리만 CSS로(DS Button lg ↔ md) */
export const previewButton = style({
  flexShrink: 0,
  height: 56,
  borderRadius: vars.radius[4],
  '@media': { [media.desktop]: { height: 46, borderRadius: vars.radius[3] } },
});

export const saveButton = style({
  flex: '1 1 auto',
  height: 56,
  borderRadius: vars.radius[4],
  '@media': {
    [media.desktop]: { flex: '0 0 auto', width: 229, height: 46, borderRadius: vars.radius[3] },
  },
});
