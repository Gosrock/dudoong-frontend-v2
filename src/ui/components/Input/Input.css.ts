import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/**
 * 입력 칸 공용 모양 — Input · SearchField · TextArea · Dropdown 트리거 · DatePicker · TimePicker가 같이 쓴다.
 * Figma Input 3종(input field · text input · icon input, `282:1692`·`512:2050`·`295:1810`):
 * 44h, 모서리 8, 안쪽 여백 12, 요소 간격 8, 테두리 `surface/default-border` → 포커스 `brand/primary`.
 * 에러·라벨·도움말·카운터는 Figma에 없는 상태다(design-system §3 "없는 상태").
 */

/** 라벨 + 도움말 + 칸 + (에러·카운터) 묶음 */
export const field = style({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  minWidth: 0,
});

/** 라벨·도움말과 칸 사이. GUI는 10 — 토큰에 없어 8 */
export const header = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  marginBottom: vars.space[2],
});

/** GUI `584:4775` 필드 제목: 18 Bold `text/primary` */
export const label = style([typography.headingMd2Emphasized, { color: vars.color.text.primary }]);

/** 필수 표시 `*` — GUI는 `brand/accent` */
export const requiredMark = style({ color: vars.color.brand.accent });

/** GUI 도움말: 14 Regular `text/primary` */
export const helper = style([typography.bodyMd, { color: vars.color.text.primary }]);

/** 칸 테두리 상자. 포커스·에러·disabled는 data 속성과 :focus-within으로 받는다 */
export const box = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
  width: '100%',
  minHeight: 44,
  padding: `0 ${vars.space[3]}`,
  border: `1px solid ${vars.color.surface.defaultBorder}`,
  borderRadius: vars.radius[2],
  background: vars.color.background.normal,
  color: vars.color.text.primary,
  transition: 'border-color 120ms ease',
  selectors: {
    '&:focus-within': { borderColor: vars.color.brand.primary },
    '&[data-invalid="true"]': { borderColor: vars.color.status.error },
    '&[data-disabled="true"]': {
      background: vars.color.interaction.disabledBg,
      borderColor: vars.color.interaction.disabled,
      color: vars.color.interaction.disabledText,
      cursor: 'not-allowed',
    },
  },
});

/** 여러 줄(TextArea) — 위쪽 정렬, 위아래 여백 */
export const boxMultiline = style({
  alignItems: 'flex-start',
  padding: vars.space[3],
});

/** 네이티브 input/textarea. 입력 글자는 Figma에서 스타일 없는 Medium 14 → labelMd(design-system §1) */
export const control = style([
  typography.labelMd,
  {
    flex: 1,
    minWidth: 0,
    height: 42,
    padding: 0,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: 'inherit',
    selectors: {
      '&::placeholder': { color: vars.color.text.tertiary, opacity: 1 },
      '&:disabled': { cursor: 'not-allowed', color: vars.color.interaction.disabledText },
      '&:disabled::placeholder': { color: vars.color.interaction.disabledText },
    },
  },
]);

export const controlMultiline = style([
  typography.bodyMd,
  { height: 'auto', resize: 'vertical', fontWeight: 500 },
]);

/** 앞 아이콘·뒤 단위. icon input의 아이콘은 24 아이콘을 20으로 줄여 쓴다(Figma `295:1811`) */
export const adornment = style([
  typography.labelMd,
  {
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
    color: 'inherit',
    whiteSpace: 'nowrap',
  },
]);
globalStyle(`${adornment} > svg`, { width: 20, height: 20 });

/** 칸 아래 — 에러 문구(왼쪽) · 글자 수(오른쪽). GUI 카운터는 칸 아래 4 */
export const footer = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: vars.space[2],
  marginTop: vars.space[1],
});

export const errorText = style([typography.bodySm, { color: vars.color.status.error }]);

/** GUI `584:5343` "0/12": 12 Medium `text/tertiary` */
export const counter = style([
  typography.labelSm,
  { marginLeft: 'auto', color: vars.color.text.tertiary, fontVariantNumeric: 'tabular-nums' },
]);
