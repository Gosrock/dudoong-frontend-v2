import { style, styleVariants } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 제목 → 상자 → [기본 이미지로] 사이 8(GUI `1452:40574`) */
export const root = style({ display: 'flex', flexDirection: 'column', gap: vars.space[2] });

/** 미리보기 상자 — 채움 `surface/container` · 테두리 `surface/default-border` · 모서리 12(GUI `1452:40578` · `1452:40593`) */
const box = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  border: `1px solid ${vars.color.surface.defaultBorder}`,
  borderRadius: vars.radius[4],
  background: vars.color.surface.container,
});

/** 프로필 160 정사각 · 커버 폭 가득 × 180(GUI) */
export const preview = styleVariants({
  PROFILE: [box, { width: 160, height: 160 }],
  COVER: [box, { width: '100%', height: 180 }],
});

export const photo = style({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

/** 사진 위에 떠 있는 [이미지 업로드] */
export const upload = style({ position: 'relative' });

export const actions = style({ display: 'flex', gap: vars.space[2] });
