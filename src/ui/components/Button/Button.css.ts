import { recipe } from '@vanilla-extract/recipes';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/**
 * Figma Button(`36:24`, design-system §3). 크기 small 32 · medium 46 · Large 56, 모서리 8 · 10 · 12.
 * 상태 색은 2026-10-25 판(68개 변형, design-system §3 "Button 상태 색"). 빈 조합(Selected는 Secondary medium에만,
 * primary 2는 medium 아이콘형·Large에만)은 같은 규칙으로 채운다.
 * Disabled는 모든 색에서 배경 `interaction/disabled-bg` + 글자 `interaction/disabled-text`, 테두리 없음.
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
      /** Hover #F7F7F6(`120:982` — 650:1200 등) · Pressed #EEEEED(`197:4875` — 438:1793 등), 테두리는 그대로 `surface/default-border` */
      secondary: {
        background: vars.color.background.normal,
        borderColor: vars.color.surface.defaultBorder,
        color: vars.color.text.secondaryLabel,
        selectors: {
          '&:hover:not(:disabled)': { background: vars.color.surface.container },
          '&:active:not(:disabled)': { background: vars.color.background.grey },
          '&[data-selected="true"]:not(:disabled)': {
            background: vars.color.background.grey,
            borderColor: vars.color.surface.strongBorder,
            color: vars.color.text.primaryLabel,
          },
        },
      },
      /**
       * Figma "primary 2"(토큰 primarySubtle과 다른 색이라 subtle로 부르지 않는다).
       * Normal 배경 Violet 100(`640:1888`) + 글자·아이콘 Violet 300(`424:686`, `645:1506`·`423:767`),
       * Hover 배경 Violet 200 + 글자 Violet 400(`650:1219`·`650:1291`), Pressed 배경 Violet 300 + 글자 #F7F7F6(`650:1224`·`650:1296`).
       * Normal 대비가 2.75:1이라 디자이너 확인 중(design-system §3·§5) — Figma 값대로 둔다.
       */
      tonal: {
        background: vars.color.brand.primaryContainer,
        color: vars.color.brand.onPrimaryContainer,
        selectors: {
          '&:hover:not(:disabled)': {
            background: vars.color.button.tonalHoverBg,
            color: vars.color.text.brandLabel,
          },
          '&:active:not(:disabled)': {
            background: vars.color.button.tonalPressedBg,
            color: vars.color.text.onBrand,
          },
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
        // 2026-10-25: medium은 아이콘 유무와 관계없이 모두 46h(`36:47`·`36:68`)
        { height: 46, padding: `0 ${vars.space[4]}`, gap: 6, borderRadius: vars.radius[3] },
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
    { variants: { size: 'md', iconOnly: true }, style: { width: 46 } },
    { variants: { size: 'lg', iconOnly: true }, style: { width: 56 } },
  ],
  defaultVariants: { variant: 'primary', size: 'md' },
});
