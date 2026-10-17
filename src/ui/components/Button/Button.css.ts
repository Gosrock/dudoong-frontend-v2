import { recipe } from '@vanilla-extract/recipes';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/**
 * Figma Button(design-system §3). 크기 small 32 · medium 45 · Large 56, 모서리 8 · 10 · 12.
 * Figma에 듬성듬성 있는 변형(Hover는 Primary에만, Selected는 Secondary medium에만)은 같은 규칙으로 채운다.
 * Secondary 글자색은 크기마다 달랐는데 `text.secondaryLabel` 하나로 통일했다(design-system §5 정리 요청).
 */
export const button = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid transparent',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background-color 120ms ease, border-color 120ms ease',
    selectors: {
      // 진행 중(aria-busy)에는 비활성이지만 변형 색을 유지한다
      '&:disabled:not([aria-busy="true"])': {
        cursor: 'not-allowed',
        background: vars.color.interaction.disabledBg,
        borderColor: 'transparent',
        color: vars.color.interaction.disabledText,
      },
    },
  },
  variants: {
    variant: {
      primary: {
        background: vars.color.brand.primary,
        color: vars.color.text.onBrand,
        selectors: {
          '&:hover:not(:disabled)': { background: vars.color.brand.primaryHover },
          '&:active:not(:disabled)': { background: vars.color.brand.primaryPressed },
        },
      },
      secondary: {
        background: vars.color.background.normal,
        borderColor: vars.color.surface.defaultBorder,
        color: vars.color.text.secondaryLabel,
        selectors: {
          '&:hover:not(:disabled), &:active:not(:disabled)': {
            background: vars.color.background.grey,
          },
          '&[data-selected="true"]:not(:disabled)': {
            background: vars.color.background.grey,
            borderColor: vars.color.surface.strongBorder,
            color: vars.color.text.primaryLabel,
          },
        },
      },
      /** Figma "primary 2" — 배경 brand.primaryContainer, 글자 brandLabel(토큰 primarySubtle과 다른 색이라 subtle로 부르지 않는다) */
      tonal: {
        background: vars.color.brand.primaryContainer,
        color: vars.color.text.brandLabel,
        selectors: {
          '&:active:not(:disabled)': { background: vars.color.brand.primarySubtle },
        },
      },
      /** 검정 채움 — GUI 빈 화면·주문 완료 버튼이 Primary 채움을 text/primary-label로 덮어쓴 것(P2) */
      dark: {
        background: vars.color.text.primaryLabel,
        color: vars.color.background.normal,
        selectors: {
          '&:hover:not(:disabled), &:active:not(:disabled)': { opacity: 0.85 },
        },
      },
    },
    size: {
      sm: [
        typography.labelSm,
        {
          height: 32,
          padding: `0 ${vars.space[3]}`,
          gap: vars.space[1],
          borderRadius: vars.radius[2],
        },
      ],
      md: [
        typography.labelMdEmphasized,
        { height: 45, padding: `0 ${vars.space[4]}`, gap: 6, borderRadius: vars.radius[3] },
      ],
      lg: [
        typography.labelLgEmphasized,
        { height: 56, padding: '0 20px', gap: 6, borderRadius: vars.radius[4] },
      ],
    },
    iconOnly: {
      true: { paddingLeft: 0, paddingRight: 0 },
    },
    fullWidth: {
      true: { width: '100%' },
    },
    loading: {
      true: { cursor: 'progress' },
    },
  },
  compoundVariants: [
    { variants: { size: 'sm', iconOnly: true }, style: { width: 32 } },
    { variants: { size: 'md', iconOnly: true }, style: { width: 45 } },
    { variants: { size: 'lg', iconOnly: true }, style: { width: 56 } },
  ],
  defaultVariants: { variant: 'primary', size: 'md' },
});
