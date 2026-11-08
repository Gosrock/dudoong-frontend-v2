import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';
import { typography } from '@/ui/theme/typography.css';

/**
 * GUI 에디터 카드(`1325:15322` PC · `1325:15571` 모바일, #190): 흰 판 · 테두리 `surface/default-border` · 모서리 12.
 * FIGMA-CUSTOM: 화면이 직접 그린 카드 · 툴바(DS에 에디터가 없다) → 커스텀 `SectionEditor.css.ts`. DS 후보(design-system §3)
 */
export const root = style({
  display: 'flex',
  flexDirection: 'column',
  background: vars.color.background.normal,
  border: `1px solid ${vars.color.surface.defaultBorder}`,
  borderRadius: vars.radius[4],
  overflow: 'hidden',
});

/** 툴바 — 배경 `surface/container` · 아래 선 · 안쪽 위아래 8 · 좌우 12 · 버튼 사이 4(53h) */
export const toolbar = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: vars.space[1],
  padding: `${vars.space[2]} ${vars.space[3]}`,
  background: vars.color.surface.container,
  borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
});

const toolBase = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 36,
  padding: 0,
  border: '1px solid transparent',
  borderRadius: vars.radius[2],
  background: vars.color.background.normal,
  color: vars.color.text.primary,
  cursor: 'pointer',
  selectors: {
    // 켜짐 — GUI `1320:426` "버튼/굵게 (켜짐)": 테두리 1 `surface/strong-border`
    '&[aria-pressed="true"]': { borderColor: vars.color.surface.strongBorder },
    '&:hover:not(:disabled)': { background: vars.color.surface.container },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
    '&:disabled': { color: vars.color.interaction.disabledText, cursor: 'not-allowed' },
  },
});

/** [B][H][목록] — 36 정사각 · 흰 · 모서리 8 */
export const tool = style([toolBase, { width: 36 }]);

/** [이미지] — 아이콘 18 ↔ 글자 6 · 안쪽 왼 10 · 오른 12 · `Label/md` */
export const toolWide = style([
  toolBase,
  typography.labelMd,
  { gap: 6, paddingLeft: 10, paddingRight: vars.space[3] },
]);

/** "B" · "H" — Figma 17 굵게(글자 스타일 없음). 가장 가까운 `Heading/md2 - emphasized`(18 · 700)에 크기만 17 */
export const toolLetter = style([typography.headingMd2Emphasized, { fontSize: 17 }]);

export const toolIcon = style({ width: 18, height: 18 });

/** 구분선 1×20 — `surface/default-border` */
export const toolDivider = style({
  width: 1,
  height: 20,
  background: vars.color.surface.defaultBorder,
});

/** 입력 영역 — 안쪽 24 · 카드 455 − 툴바 53 ≈ 400 */
export const content = style({ flex: '1 0 auto', padding: vars.space[5] });

export const prose = style({
  minHeight: 352,
  outline: 'none',
  borderRadius: vars.radius[2],
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 4 },
  },
});

globalStyle(`${prose} img`, { maxWidth: '100%', height: 'auto', borderRadius: vars.radius[2] });
globalStyle(`${prose} img.ProseMirror-selectednode`, {
  outline: `2px solid ${vars.color.brand.primary}`,
});
