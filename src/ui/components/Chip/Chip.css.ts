import { recipe } from '@vanilla-extract/recipes';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/**
 * Figma `tag_v2`(`693:668`, 페이지 ┗ Chip, 2026-10-31) — 범용 칩 하나. 옛 Tag 5종(Ticket state chip·tag·role chip·
 * Concert state chip·money option chip)은 2026-10-31 사용자 결정으로 이걸로 바꿨다(design-system §3 대응표).
 * - size: sm 22h `Label/sm`(12) · lg 25h `Label/md`(14). Figma 좌우 패딩은 sm 10(토큰 아님 → `space[2]` 8, §5 요청) · lg 12.
 * - shape(Figma `variant`): square 모서리 8(`Radius/2`) · round 알약.
 * - theme: weak 옅은 배경 + 진한 글자 · fill 진한 배경 + 옅은 글자 · border 배경 없음 + 진한 테두리·글자.
 */
const palette = {
  violet: { strong: vars.color.brand.primary, subtle: vars.color.brand.primarySubtle },
  red: { strong: vars.color.brand.accent, subtle: vars.color.brand.accentSubtle },
  green: { strong: vars.color.status.success, subtle: vars.color.status.successSubtle },
  grey: { strong: vars.color.surface.strongBorder, subtle: vars.color.interaction.disabledBg },
  cyan: { strong: vars.color.chip.cyan, subtle: vars.color.chip.cyanSubtle },
  purple: { strong: vars.color.chip.purple, subtle: vars.color.chip.purpleSubtle },
} as const;

export type ChipColor = keyof typeof palette;
export type ChipTheme = 'weak' | 'fill' | 'border';

const colorNames = Object.keys(palette) as ChipColor[];
const themes: ChipTheme[] = ['weak', 'fill', 'border'];

const themeStyle = (c: (typeof palette)[ChipColor], t: ChipTheme) =>
  t === 'weak'
    ? { background: c.subtle, color: c.strong }
    : t === 'fill'
      ? { background: c.strong, color: c.subtle }
      : { background: 'transparent', borderColor: c.strong, color: c.strong };

export const chip = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxSizing: 'border-box',
    border: '1px solid transparent',
    whiteSpace: 'nowrap',
  },
  variants: {
    size: {
      sm: [typography.labelSm, { height: 22, padding: `0 ${vars.space[2]}` }],
      lg: [typography.labelMd, { height: 25, padding: `0 ${vars.space[3]}` }],
    },
    shape: {
      square: { borderRadius: vars.radius[2] },
      round: { borderRadius: vars.radius.full },
    },
    color: Object.fromEntries(colorNames.map((c) => [c, {}])) as Record<ChipColor, object>,
    theme: { weak: {}, fill: {}, border: {} },
  },
  compoundVariants: colorNames.flatMap((c) =>
    themes.map((t) => ({ variants: { color: c, theme: t }, style: themeStyle(palette[c], t) })),
  ),
  defaultVariants: { size: 'sm', shape: 'square', color: 'grey', theme: 'weak' },
});
