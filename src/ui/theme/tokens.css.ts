import {
  assignVars,
  createGlobalTheme,
  createThemeContract,
  globalStyle,
} from '@vanilla-extract/css';

import { media } from './breakpoints';
import { palette } from './palette';

/**
 * 디자인 토큰(design-system.md §1). 색은 Figma `Sementic` 컬렉션의 Light/Dark를 그대로 옮겼다.
 * 다크 모드: 토큰은 두 벌 다 두고 출시는 라이트만 한다 — `<html data-theme="dark">`일 때만 다크 값이 적용된다.
 * `avatar`·`role`·`chip`은 Figma가 원시 색을 직접 쓰는 곳을 묶은 컴포넌트 전용 토큰이다(다크 값은 디자인 대기라 라이트와 같다).
 */
const colorContract = createThemeContract({
  color: {
    brand: {
      primary: null,
      primaryHover: null,
      primaryPressed: null,
      primarySubtle: null,
      primaryContainer: null,
      onPrimaryContainer: null,
      accent: null,
      accentHover: null,
      accentPressed: null,
      accentSubtle: null,
    },
    text: {
      primary: null,
      secondary: null,
      tertiary: null,
      inverse: null,
      onBrand: null,
      primaryLabel: null,
      secondaryLabel: null,
      tertiaryLabel: null,
      disabledLabel: null,
      brandLabel: null,
      dangerLabel: null,
    },
    status: { success: null, successSubtle: null, warning: null, warningSubtle: null, error: null },
    interaction: {
      inactive: null,
      inactiveBg: null,
      disabled: null,
      disabledBg: null,
      disabledText: null,
    },
    surface: { container: null, defaultBorder: null, strongBorder: null, defaultLabel: null },
    background: { normal: null, grey: null, dark: null },
    avatar: { teal: null, orange: null, indigo: null },
    role: { masterBg: null, masterText: null, managerBg: null, managerText: null },
    chip: { giftPendingBg: null, ddayBg: null, ddayText: null, pastBg: null },
    /** 오버레이 딤·그림자. background.dark는 다크에서 흰색이 되므로 따로 둔다(P2) */
    overlay: { dim: null, shadow: null },
  },
});

const light = {
  color: {
    brand: {
      primary: palette.violet[400],
      primaryHover: palette.violet[500],
      primaryPressed: palette.violet[600],
      primarySubtle: palette.violet[50],
      primaryContainer: palette.violet[100],
      onPrimaryContainer: palette.violet[300],
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
      defaultBorder: palette.neutral[200],
      strongBorder: palette.neutral[400],
      defaultLabel: palette.neutral[100],
    },
    background: {
      normal: palette.common.white,
      grey: palette.neutral[100],
      dark: palette.neutral[900],
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
      ddayBg: palette.coralRed[50],
      ddayText: palette.coralRed[200],
      pastBg: palette.neutral[50],
    },
    overlay: {
      dim: `color-mix(in srgb, ${palette.neutral[900]} 70%, transparent)`,
      shadow: `color-mix(in srgb, ${palette.neutral[900]} 15%, transparent)`,
    },
  },
};

const dark = {
  color: {
    brand: {
      primary: palette.violet[300],
      primaryHover: palette.violet[200],
      primaryPressed: palette.violet[500],
      primarySubtle: palette.blue[800],
      primaryContainer: palette.violet[400],
      onPrimaryContainer: palette.violet[300],
      accent: palette.coralRed[300],
      accentHover: palette.coralRed[200],
      accentPressed: palette.coralRed[500],
      accentSubtle: palette.coralRed[800],
    },
    text: {
      primary: palette.neutral[50],
      secondary: palette.neutral[300],
      tertiary: palette.neutral[500],
      inverse: palette.neutral[800],
      onBrand: palette.neutral[50],
      primaryLabel: palette.neutral[50],
      secondaryLabel: palette.neutral[400],
      tertiaryLabel: palette.neutral[500],
      disabledLabel: palette.neutral[600],
      brandLabel: palette.violet[300],
      dangerLabel: palette.coralRed[300],
    },
    status: {
      success: palette.green[300],
      successSubtle: palette.green[800],
      warning: palette.coralRed[300],
      warningSubtle: palette.coralRed[800],
      error: palette.coralRed[300],
    },
    interaction: {
      inactive: palette.neutral[500],
      inactiveBg: palette.neutral[700],
      disabled: palette.neutral[600],
      disabledBg: palette.neutral[800],
      disabledText: palette.neutral[600],
    },
    surface: {
      container: palette.neutral[800],
      defaultBorder: palette.neutral[600],
      strongBorder: palette.neutral[400],
      defaultLabel: palette.common.white,
    },
    background: {
      normal: palette.neutral[900],
      grey: palette.neutral[800],
      dark: palette.common.white,
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
      ddayBg: palette.coralRed[50],
      ddayText: palette.coralRed[200],
      pastBg: palette.neutral[50],
    },
    overlay: {
      dim: `color-mix(in srgb, ${palette.common.black} 70%, transparent)`,
      shadow: `color-mix(in srgb, ${palette.common.black} 40%, transparent)`,
    },
  },
};

createGlobalTheme(':root', colorContract, light);
globalStyle(':root[data-theme="dark"]', { vars: assignVars(colorContract, dark) });

const base = createGlobalTheme(':root', {
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
        [base.space[7]]: '48px',
        [base.space[8]]: '64px',
        [base.space[9]]: '80px',
        [base.space[10]]: '96px',
      },
    },
  },
});

export const vars = { ...base, ...colorContract };
