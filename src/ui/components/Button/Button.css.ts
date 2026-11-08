import { recipe } from '@vanilla-extract/recipes';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/**
 * Figma Button(`36:24`, design-system §3). 크기 small 32 · medium 46 · Large 56, 모서리 8 · 10 · 12.
 * 상태 색은 2026-10-25 판(68개 변형, design-system §3 "Button 상태 색"). 빈 조합(Selected는 Secondary medium에만,
 * primary 2는 medium 아이콘형·Large에만)은 같은 규칙으로 채운다.
 * Disabled는 모든 색에서 배경 `interaction/disabled-bg` + 글자 `interaction/disabled-text`, 테두리 없음.
 * 2026-11-01: primary 2 글자만(`Icon=False`) medium·Large × 4상태가 생겼다 — 색은 아래 tonal과 같다.
 * 2026-11-08 판(#185 · #186): `Color=Warning` 28변형(채움 `brand/accent` 계열) · 글자 있는 변형마다 **min width**
 * (글자만 small 55 · medium 69 · Large 82 / 아이콘 + 글자 75 · 92 · 108, 아이콘만 · round는 없음) ·
 * medium 글자만은 모든 색이 45h(옛 판은 primary 2만 45, 아이콘 있는 판은 46 그대로).
 * medium 아이콘 + 글자 간격은 5(`36:68` — 글자만 `36:47`의 6은 자식이 하나라 화면에 안 보인다).
 * 아이콘 자리는 Figma에서 인스턴스 스왑(`ic_blank`)으로 바뀌었다 — 코드는 원래 `icon` prop이라 바뀌는 것 없음.
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
       * Normal 배경 `brand/Primary container fixed`(Violet 100) + 글자·아이콘 `brand/on Primary container`(Violet 400),
       * Hover `brand/Primary container-hover`(Violet 200) + `brand/on Primary container-hover`(Violet 400),
       * Pressed `brand/Primary container-pressed`(Violet 300) + `text/on-brand fixed`(Neutral 50).
       * Normal 대비가 2.75:1이라 디자이너 확인 중(design-system §3·§5) — Figma 값대로 둔다.
       */
      tonal: {
        background: vars.color.brand.primaryContainer,
        color: vars.color.brand.onPrimaryContainer,
        selectors: {
          '&:hover:not(:disabled)': {
            background: vars.color.brand.primaryContainerHover,
            color: vars.color.brand.onPrimaryContainerHover,
          },
          '&:active:not(:disabled)': {
            background: vars.color.brand.primaryContainerPressed,
            color: vars.color.text.onBrandFixed,
          },
        },
      },
      /**
       * Figma `Color=Warning`(`844:1274` 등, #185) — 위험 동작(삭제 · 취소) 확인. Normal `brand/accent`(Coral-red 400) ·
       * Hover `brand/accent-hover`(500) · Pressed `brand/accent-pressed`(600), 글자 · 아이콘 `text/on-brand fixed`(Neutral 50).
       * Disabled는 다른 색과 같다(base)
       */
      warning: {
        background: vars.color.brand.accent,
        color: vars.color.text.onBrandFixed,
        selectors: {
          '&:hover:not(:disabled)': { background: vars.color.brand.accentHover },
          '&:active:not(:disabled)': { background: vars.color.brand.accentPressed },
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
    /** min width는 글자만 판(`Icon=False`, #186) — 아이콘 + 글자는 아래 compound, 아이콘만 · round는 풀어 둔다 */
    size: {
      sm: [
        typography.labelSm,
        {
          height: 32,
          minWidth: 55,
          padding: `0 ${vars.space[3]}`,
          gap: vars.space[1],
          borderRadius: vars.radius[2],
        },
      ],
      md: [
        typography.labelMdEmphasized,
        // medium 글자만 45h(2026-11-08 판 — 모든 색) · 아이콘이 있으면 46(아래 compound). 아이콘 + 글자 간격 5(`36:68`, 토큰에 없는 값 그대로)
        {
          height: 45,
          minWidth: 69,
          padding: `0 ${vars.space[4]}`,
          gap: 5,
          borderRadius: vars.radius[3],
        },
      ],
      lg: [
        typography.labelLgEmphasized,
        { height: 56, minWidth: 82, padding: '0 20px', gap: 6, borderRadius: vars.radius[4] },
      ],
    },
    iconOnly: {
      true: { paddingLeft: 0, paddingRight: 0, minWidth: 0 },
    },
    /** 아이콘 + 글자 — 높이 · min width가 글자만 판과 다르다(아래 compound) */
    iconText: {
      true: {},
    },
    /**
     * FIGMA-CUSTOM: 원형 34 아이콘 버튼 — 대시보드 머리 연필(gui `727:23261` "Frame 34491")이 직접 그린 원 34 · 안쪽 5 ·
     * 아이콘 24를 Figma대로(R1a, 사용자 결정 2026-11-07 "화면대로"). DS Button 세트에는 아직 없다 — 2단계 후보
     * (figma-deviations §5). 크기 변형보다 뒤에 두어 높이 · 패딩을 덮는다 — `iconOnly`와 같이 주지 않는다.
     */
    round: {
      true: { width: 34, height: 34, minWidth: 0, padding: 0, borderRadius: vars.radius.full },
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
    { variants: { size: 'md', iconOnly: true }, style: { width: 46, height: 46 } },
    { variants: { size: 'lg', iconOnly: true }, style: { width: 56 } },
    // 아이콘 + 글자(`Icon=True, Text=true`) — min width small 75 · medium 92(높이 46) · Large 108(#186)
    { variants: { size: 'sm', iconText: true }, style: { minWidth: 75 } },
    { variants: { size: 'md', iconText: true }, style: { minWidth: 92, height: 46 } },
    { variants: { size: 'lg', iconText: true }, style: { minWidth: 108 } },
    /**
     * primary 2 아이콘만(Figma Large `Text=false`, 2026-10-31)은 배경이 `brand/secondary` 계열 —
     * Normal Violet 50 · Hover Violet 100 · Pressed Violet 200. 아이콘 색은 글자 있는 판과 같다.
     * Figma에는 Large만 있다 — 다른 크기도 같은 규칙으로 채운다.
     */
    {
      variants: { variant: 'tonal', iconOnly: true },
      style: {
        background: vars.color.brand.secondary,
        selectors: {
          '&:hover:not(:disabled)': { background: vars.color.brand.secondaryHover },
          '&:active:not(:disabled)': { background: vars.color.brand.secondaryPressed },
        },
      },
    },
  ],
  defaultVariants: { variant: 'primary', size: 'md' },
});
