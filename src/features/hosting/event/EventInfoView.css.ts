import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 기본 정보 — 모바일(GUI `748:33451`): 좌우 24, 칸 묶음 사이 8 · 묶음 안 위아래 16.
 * PC(`748:34006`): 본문 위 28(→ 24) · 좌우 24, 제목 `Heading/lg-emphasized` + 아래 24, 1280~ 두 열 342 | 50(→ 48) | 오른쪽(칸 최대 600).
 */
export const page = style({ display: 'flex', flexDirection: 'column', flex: '1 0 auto' });

export const body = style({
  flex: '1 0 auto',
  padding: `${vars.space[3]} ${vars.space[5]} ${vars.space[6]}`,
  '@media': { [media.desktop]: { padding: `${vars.space[5]} ${vars.space[5]} ${vars.space[7]}` } },
});

/** PC만 — 모바일은 헤더 제목("기본 정보 ▾")이 대신한다 */
export const desktopTitle = style({
  margin: 0,
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  '@media': {
    [media.desktop]: {
      position: 'static',
      width: 'auto',
      height: 'auto',
      overflow: 'visible',
      clip: 'auto',
      display: 'block',
      margin: 0,
      paddingBottom: vars.space[5],
    },
  },
});

export const columns = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  '@media': {
    [media.desktop]: { maxWidth: 600 },
    [media.desktopS]: {
      maxWidth: 'none',
      display: 'grid',
      gridTemplateColumns: '342px minmax(0, 1fr)',
      columnGap: vars.space[8],
      alignItems: 'start',
    },
  },
});

export const fields = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  minWidth: 0,
  '@media': { [media.desktopS]: { maxWidth: 600 } },
});
