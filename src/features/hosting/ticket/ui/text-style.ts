import { vars } from '@/ui/theme/tokens.css';
import { type Typography, typographySpecs } from '@/ui/theme/typography.css';

/** 글자 스타일을 CSS 값으로(같은 DOM에서 PC만 크기를 바꿀 때 — 반응형은 CSS가 정한다, patterns §1) */
export const textOf = (t: Typography) => {
  const s = typographySpecs[t];
  return {
    fontFamily: vars.font[s.font],
    fontSize: s.size,
    fontWeight: s.weight,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
  };
};
