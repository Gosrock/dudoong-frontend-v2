import { createSprinkles, defineProperties } from '@vanilla-extract/sprinkles';

import { media } from './breakpoints';
import { vars } from './tokens.css';

/**
 * 화면 코드가 인라인으로 쓰는 토큰 유틸리티(patterns §1·§3). 반응형 값은 `{ mobile, desktop }`.
 * 서버와 클라이언트가 같은 DOM을 그리고, 무엇이 보일지는 CSS가 정한다.
 */
const responsive = defineProperties({
  conditions: {
    mobile: {},
    desktop: { '@media': media.desktop },
  },
  defaultCondition: 'mobile',
  properties: {
    display: ['none', 'block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid'],
    flexDirection: ['row', 'column', 'row-reverse', 'column-reverse'],
    flexWrap: ['nowrap', 'wrap'],
    alignItems: ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'],
    justifyContent: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'],
    gap: vars.space,
    padding: vars.space,
    paddingTop: vars.space,
    paddingBottom: vars.space,
    paddingLeft: vars.space,
    paddingRight: vars.space,
    marginTop: vars.space,
    marginBottom: vars.space,
    marginLeft: vars.space,
    marginRight: vars.space,
    width: ['100%', 'auto'],
    textAlign: ['left', 'center', 'right'],
  },
  shorthands: {
    paddingX: ['paddingLeft', 'paddingRight'],
    paddingY: ['paddingTop', 'paddingBottom'],
    marginX: ['marginLeft', 'marginRight'],
    marginY: ['marginTop', 'marginBottom'],
  },
});

const colors = defineProperties({
  properties: {
    color: {
      ...vars.color.text,
      brand: vars.color.brand.primary,
      danger: vars.color.text.dangerLabel,
    },
    background: {
      ...vars.color.background,
      container: vars.color.surface.container,
      brand: vars.color.brand.primary,
    },
    borderRadius: vars.radius,
  },
});

export const sprinkles = createSprinkles(responsive, colors);
export type Sprinkles = Parameters<typeof sprinkles>[0];
