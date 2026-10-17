import { style } from '@vanilla-extract/css';

/** Figma에 없는 컴포넌트. Input과 같은 테두리·에러·카운터 규칙에 여러 줄만 다르다 */
export const textarea = style({ width: '100%', minHeight: 0 });
