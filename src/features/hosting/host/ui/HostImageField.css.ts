import { style, styleVariants } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 제목 → 상자 8 · 상자 → 안내 8 · 안내 → [기본 이미지로] 8(GUI `1456:4744` · `1524:13302` 간격 8).
 * PC는 제목 → 상자 16(`1522:104351` 간격 16), 나머지 8
 */
export const root = style({ display: 'flex', flexDirection: 'column', gap: vars.space[2] });

export const title = style({
  '@media': { [media.desktop]: { marginBottom: vars.space[2] } },
});

/** 미리보기 상자 — 채움 `surface/container` · 테두리 `surface/default-border` · 모서리 12(GUI `1456:4746` · `1456:4767`). 실패면 빨간 테두리(`1524:13417`) */
const box = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  border: `1px solid ${vars.color.surface.defaultBorder}`,
  borderRadius: vars.radius[4],
  background: vars.color.surface.container,
  selectors: { '&[data-error]': { borderColor: vars.color.status.error } },
});

/** 프로필 160 정사각 · 커버 폭 가득 × 171(모바일 342×171 = 2:1 — #278, PC 960×171 `1496:12788`) */
export const preview = styleVariants({
  PROFILE: [box, { width: 160, height: 160 }],
  COVER: [box, { width: '100%', height: 171 }],
});

export const photo = style({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

/** 올리는 중 덮개 — 흰 60%(GUI `1524:13356` #ffffff 60%, 변수 없는 값) */
export const uploadingCover = style({
  position: 'absolute',
  inset: 0,
  background: `color-mix(in srgb, ${vars.color.background.normal} 60%, transparent)`,
});

/** 사진 위에 떠 있는 [이미지 업로드] */
export const upload = style({ position: 'relative' });

/** 올리는 중 — 버튼 크기는 그대로 두고 글자 · 아이콘을 감춘다(`1524:13308` 글자 · 아이콘 투명) */
export const hiddenLabel = style({ visibility: 'hidden' });

/** 버튼 자리 가운데 스피너 20(`1524:13364`) */
export const spinner = style({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
});

/** 칸 아래 안내 · 오류 한 줄 */
export const note = style({ display: 'flex' });

export const actions = style({ display: 'flex', gap: vars.space[2] });
