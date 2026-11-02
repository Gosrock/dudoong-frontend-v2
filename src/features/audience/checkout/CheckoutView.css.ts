import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 체크아웃(GUI `564:4156` 등 — 390 모바일만 Ready). PC(1024~)는 그림이 없어 같은 한 열을 가운데 640으로 둔다.
 */
export const page = style({
  flex: '1 0 auto',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  '@media': {
    [media.desktop]: {
      maxWidth: 640,
      margin: '0 auto',
      paddingTop: vars.space[7],
    },
  },
});

/** 화면 제목(h1). 모바일은 하위 헤더가 공연 이름을 보이므로 글자를 숨기고(읽기 전용), PC는 보인다 */
export const title = style({
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  '@media': {
    [media.desktop]: {
      position: 'static',
      width: 'auto',
      height: 'auto',
      overflow: 'visible',
      clip: 'auto',
      whiteSpace: 'normal',
      padding: `0 ${vars.space[5]} ${vars.space[5]}`,
    },
  },
});
