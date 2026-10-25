import { createGlobalTheme, globalStyle } from '@vanilla-extract/css';

import { media } from './breakpoints';
import { palette } from './palette';

/**
 * 디자인 토큰(design-system.md §1). 색은 Figma `Sementic` 컬렉션의 Light 값을 옮겼다.
 * 다크 모드는 지원하지 않는다(사용자 결정 2026-10-25) — 토큰은 라이트 한 벌을 `:root`에 둔다.
 * `avatar`·`role`·`chip`은 Figma가 원시 색을 직접 쓰는 곳을 묶은 컴포넌트 전용 토큰이다.
 */
export const vars = createGlobalTheme(':root', {
  color: {
    brand: {
      primary: palette.violet[400],
      primaryHover: palette.violet[500],
      primaryPressed: palette.violet[600],
      primarySubtle: palette.violet[50],
      primaryContainer: palette.violet[100],
      primaryContainerFixed: palette.violet[100],
      onPrimaryContainer: palette.violet[400],
      primaryContainerHover: palette.violet[200],
      onPrimaryContainerHover: palette.violet[400],
      primaryContainerPressed: palette.violet[300],
      secondary: palette.violet[50],
      secondaryHover: palette.violet[100],
      secondaryPressed: palette.violet[200],
      accent: palette.coralRed[400],
      accentHover: palette.coralRed[500],
      accentPressed: palette.coralRed[600],
      accentSubtle: palette.coralRed[50],
    },
    text: {
      primary: palette.neutral[800],
      secondary: palette.neutral[500],
      tertiary: palette.neutral[300],
      inverse: palette.neutral[50],
      onBrand: palette.neutral[50],
      onBrandFixed: palette.neutral[50],
      primaryLabel: palette.neutral[800],
      secondaryLabel: palette.neutral[500],
      tertiaryLabel: palette.neutral[300],
      disabledLabel: palette.neutral[200],
      brandLabel: palette.violet[400],
      dangerLabel: palette.coralRed[400],
    },
    status: {
      success: palette.green[400],
      successSubtle: palette.green[50],
      warning: palette.coralRed[400],
      warningSubtle: palette.coralRed[50],
      error: palette.coralRed[400],
    },
    interaction: {
      inactive: palette.neutral[300],
      inactiveBg: palette.neutral[100],
      disabled: palette.neutral[300],
      disabledBg: palette.neutral[100],
      disabledText: palette.neutral[300],
    },
    surface: {
      container: palette.neutral[50],
      container2: palette.neutral[50],
      defaultBorder: palette.neutral[200],
      strongBorder: palette.neutral[400],
      defaultLabel: palette.neutral[100],
      imageBg: palette.neutral[100],
      inverseHover: palette.neutral[700],
      inversePressed: palette.neutral[900],
    },
    background: {
      normal: palette.common.white,
      normal2: palette.common.white,
      grey: palette.neutral[100],
      dark: palette.neutral[900],
      darkFixed: palette.neutral[900],
    },
    avatar: {
      teal: palette.teal[300],
      orange: palette.orange[300],
      indigo: palette.violet[200],
    },
    role: {
      masterBg: palette.purple[50],
      masterText: palette.purple[400],
      managerBg: palette.teal[50],
      managerText: palette.teal[400],
    },
    chip: {
      giftPendingBg: palette.coralRed[50],
    },
    /** 오버레이 딤·그림자 */
    overlay: {
      dim: `color-mix(in srgb, ${palette.neutral[900]} 70%, transparent)`,
      shadow: `color-mix(in srgb, ${palette.neutral[900]} 15%, transparent)`,
    },
  },
  /** Space/1~10. 7~10은 데스크탑에서 커진다(Figma Component 컬렉션 Mobile/Desktop 모드). */
  space: {
    0: '0',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '24px',
    6: '32px',
    7: '40px',
    8: '48px',
    9: '64px',
    10: '80px',
  },
  radius: {
    0: '0',
    1: '4px',
    2: '8px',
    3: '10px',
    4: '12px',
    5: '16px',
    6: '20px',
    7: '24px',
    full: '9999px',
  },
  font: {
    body: '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", system-ui, sans-serif',
    // Kartrider는 웹 임베드 라이선스 확인 전이라 불러오지 않는다 — 설치돼 있으면 쓰고, 아니면 본문 폰트(design-system §1)
    display: '"Kartrider Kor", "Pretendard Variable", Pretendard, sans-serif',
    number: 'var(--font-saira), "Saira Condensed", "Pretendard Variable", sans-serif',
  },
  zIndex: { header: '100', sheet: '1000', modal: '1100', popover: '1150', toast: '1200' },
  shadow: { drop: '0 4px 4px rgba(0, 0, 0, 0.1)' },
});

globalStyle(':root', {
  '@media': {
    [media.desktop]: {
      vars: {
        [vars.space[7]]: '48px',
        [vars.space[8]]: '64px',
        [vars.space[9]]: '80px',
        [vars.space[10]]: '96px',
      },
    },
  },
});
