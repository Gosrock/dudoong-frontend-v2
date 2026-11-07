import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 기본 정보 — 모바일(GUI `748:33451`): 좌우 24, 칸 묶음 사이 8 · 묶음 안 위아래 16.
 * PC(`748:34006`): 본문 위아래 28 · 좌우 24, 제목 `Heading/lg-emphasized` + 아래 24, 칸 묶음 사이 0(묶음 위아래 16이 간격),
 * 1280~ 두 열 342 | 50 | 오른쪽(칸 최대 600). 28 · 50은 토큰에 없는 값 그대로(분류표 H2, M-4 2026-11-08)
 */
export const page = style({ display: 'flex', flexDirection: 'column', flex: '1 0 auto' });

export const body = style({
  flex: '1 0 auto',
  padding: `${vars.space[3]} ${vars.space[5]} ${vars.space[6]}`,
  '@media': { [media.desktop]: { padding: `28px ${vars.space[5]}` } },
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
      // 글자 줄 상자만(h1 기본 줄 높이가 31을 62로 키웠다 — 예매자 관리 `desktopTitle`과 같은 처리, GUI `748:34683` 55)
      display: 'flex',
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
      columnGap: 50,
      alignItems: 'start',
    },
  },
});

export const fields = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  minWidth: 0,
  '@media': { [media.desktop]: { gap: 0 }, [media.desktopS]: { maxWidth: 600 } },
});
