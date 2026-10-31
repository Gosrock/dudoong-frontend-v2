import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';
import { typographySpecs } from '@/ui/theme/typography.css';

/**
 * 섹션 본문(sanitize된 HTML — 서버가 준 서식이라 프리미티브로 감쌀 수 없다). 글자 모양은 DS 글자 스타일 값만 쓴다
 * (본문 Body/lg, 제목 Heading). 와이어 `121:1216`·`640:1957` 본문은 줄바꿈된 글뿐이라 그 밖의 서식(표·인용·코드)은
 * DS 토큰으로 단순하게 둔다(design-workflow §3).
 */
const body = typographySpecs.bodyLg;

export const root = style({
  color: vars.color.text.primary,
  fontSize: body.size,
  fontWeight: body.weight,
  lineHeight: body.lineHeight,
  letterSpacing: body.letterSpacing,
  overflowWrap: 'anywhere',
  wordBreak: 'keep-all',
});

const heading = (spec: (typeof typographySpecs)[keyof typeof typographySpecs]) => ({
  fontSize: spec.size,
  fontWeight: spec.weight,
  lineHeight: spec.lineHeight,
  letterSpacing: spec.letterSpacing,
  margin: `${vars.space[5]} 0 ${vars.space[3]}`,
});

globalStyle(`${root} > :first-child`, { marginTop: 0 });
globalStyle(`${root} > :last-child`, { marginBottom: 0 });
globalStyle(`${root} h1`, heading(typographySpecs.headingLgEmphasized));
globalStyle(`${root} h2`, heading(typographySpecs.headingMdEmphasized));
globalStyle(
  `${root} h3, ${root} h4, ${root} h5, ${root} h6`,
  heading(typographySpecs.headingSmEmphasized),
);
globalStyle(`${root} p`, { margin: `0 0 ${vars.space[3]}`, minHeight: '1em' });
globalStyle(`${root} ul, ${root} ol`, {
  margin: `0 0 ${vars.space[3]}`,
  paddingLeft: vars.space[5],
});
globalStyle(`${root} li.task-list-item`, { listStyle: 'none' });
globalStyle(`${root} a`, { color: vars.color.text.brandLabel, textDecoration: 'underline' });
globalStyle(`${root} img`, {
  display: 'block',
  maxWidth: '100%',
  height: 'auto',
  margin: `${vars.space[3]} 0`,
  borderRadius: vars.radius[2],
});
globalStyle(`${root} hr`, {
  border: 0,
  height: 1,
  background: vars.color.surface.defaultBorder,
  margin: `${vars.space[5]} 0`,
});
globalStyle(`${root} blockquote`, {
  margin: `0 0 ${vars.space[3]}`,
  paddingLeft: vars.space[3],
  borderLeft: `2px solid ${vars.color.surface.defaultBorder}`,
  color: vars.color.text.secondary,
});
globalStyle(`${root} pre`, {
  margin: `0 0 ${vars.space[3]}`,
  padding: vars.space[3],
  overflowX: 'auto',
  background: vars.color.surface.container,
  borderRadius: vars.radius[2],
});
globalStyle(`${root} table`, {
  borderCollapse: 'collapse',
  display: 'block',
  overflowX: 'auto',
  margin: `0 0 ${vars.space[3]}`,
});
globalStyle(`${root} th, ${root} td`, {
  border: `1px solid ${vars.color.surface.defaultBorder}`,
  padding: vars.space[2],
  textAlign: 'left',
});
