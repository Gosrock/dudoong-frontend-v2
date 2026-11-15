import { style } from '@vanilla-extract/css';

import { fabBottom, fabClearance } from '@/ui/components/Fab/Fab.css';
import { media } from '@/ui/theme/breakpoints';
import { sprinkles } from '@/ui/theme/sprinkles.css';
import { vars } from '@/ui/theme/tokens.css';

/** 위 8(GUI `1423:2672` 위 여백) · 아래는 [+]가 마지막 줄을 가리지 않게 */
export const page = style({
  paddingTop: vars.space[2],
  paddingBottom: fabClearance.md,
  '@media': { [media.desktop]: { paddingTop: vars.space[5] } },
});

/** PC 제목 — 모바일은 하위 화면 헤더(← 공연 리스트)가 제목이다(🤖 PC는 셸 상단 바만 있어 본문에 둔다) */
export const desktopTitle = style({
  display: 'none',
  '@media': { [media.desktop]: { display: 'block', marginBottom: vars.space[5] } },
});

/** 2열 · 사이 16 · 줄 사이 24(GUI `1423:2673` 163 두 장, 줄 119 → 425). PC는 칸 200 이상으로 채운다(🤖) */
export const grid = style([
  sprinkles({ listStyle: 'none' }),
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    columnGap: vars.space[4],
    rowGap: vars.space[5],
    margin: 0,
    padding: 0,
    '@media': {
      [media.desktop]: { gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' },
    },
  },
]);

/** 로딩 자리 포스터 — DS ConcertCard 포스터 비율(163:231) */
export const skeletonPoster = style({ width: '100%', aspectRatio: '163 / 231' });

/** 오른쪽 아래 [+] — 호스트 홈과 같은 자리 */
export const fab = style({
  position: 'fixed',
  right: vars.space[5],
  bottom: fabBottom,
  zIndex: vars.zIndex.header,
  textDecoration: 'none',
});
