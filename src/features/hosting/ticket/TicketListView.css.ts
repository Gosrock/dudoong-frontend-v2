import { style } from '@vanilla-extract/css';

import { fabBottom, fabClearance } from '@/ui/components/Fab/Fab.css';
import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 티켓 관리 목록 — 모바일(GUI `767:50048`): 좌우 24 · 위아래 12, 안내 + "티켓 옵션이란?" 아래 16, 카드 사이 12.
 * PC(`767:46943`): 위 28(→ 24) · 좌우 24, 제목 `Heading/lg-emphasized` + 안내(간격 4) + "티켓 옵션이란?"(간격 12) + 아래 24,
 * 카드 두 열(554 | 16 | 554 — 1440 기준, 좁으면 같은 비율로 준다)
 */
export const page = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  flex: '1 0 auto',
  padding: `${vars.space[3]} ${vars.space[5]} ${fabClearance.lg}`,
  '@media': {
    [media.desktop]: { gap: vars.space[5], padding: `${vars.space[5]} ${vars.space[5]} 120px` },
  },
});

export const head = style({ display: 'flex', flexDirection: 'column', gap: vars.space[4] });

export const intro = style({ display: 'flex', flexDirection: 'column', gap: vars.space[1] });

/** PC만 — 모바일은 공연 헤더 제목("티켓 관리 ▾")이 대신한다 */
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
    },
  },
});

export const cards = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: vars.space[3],
  alignItems: 'start',
  margin: 0,
  padding: 0,
  '@media': {
    [media.desktop]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: vars.space[4] },
  },
});

/** 빈 상태 — 위아래 40, 일러스트 170 + 문구(간격 4) + 버튼(위 10 + 10) */
export const empty = style({ padding: `${vars.space[7]} 0` });

/** [+ 새 티켓 만들기] — DS Button Primary Large(48h · 좌우 20, `793:20845`) */
export const emptyAction = style({ height: 48, paddingInline: vars.space[5] });

/** FAB — 모바일 오른쪽 아래 16 · 24(`793:2469`), PC 오른쪽 24 · 아래 24(`821:23597`) */
export const fab = style({
  position: 'fixed',
  right: vars.space[4],
  bottom: fabBottom,
  zIndex: 10,
  '@media': { [media.desktop]: { right: vars.space[5], bottom: vars.space[5] } },
});

/** 일러스트 — 모바일 170(`793:20842`) · PC 300(`821:26485`) */
export const emptyIllustration = style({
  width: 170,
  height: 'auto',
  '@media': { [media.desktop]: { width: 300 } },
});
