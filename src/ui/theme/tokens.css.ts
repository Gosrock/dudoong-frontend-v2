import { createGlobalTheme } from '@vanilla-extract/css';

/**
 * P0 임시 토큰. P1에서 Figma 디자인 시스템 변수 전체(design-system.md §1)로 바꾼다.
 * 값은 지금 Figma의 의미 색(Light)에서 가져왔다.
 */
export const vars = createGlobalTheme(':root', {
  color: {
    brandPrimary: '#633EE7',
    brandPrimaryPressed: '#301891',
    textPrimary: '#141413',
    textOnBrand: '#F7F7F6',
    backgroundNormal: '#FFFFFF',
  },
  radius: { 2: '8px', 3: '10px', 4: '12px' },
  space: { 3: '12px', 4: '16px' },
  font: {
    body: 'Pretendard, -apple-system, "Apple SD Gothic Neo", system-ui, sans-serif',
  },
});
