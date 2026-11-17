import { style } from '@vanilla-extract/css';

import { fabBottom, fabClearance } from '@/ui/components/Fab/Fab.css';
import { media } from '@/ui/theme/breakpoints';
import { sprinkles } from '@/ui/theme/sprinkles.css';
import { vars } from '@/ui/theme/tokens.css';

/** 위 8(GUI `1423:2672` 위 여백) · 아래는 [+]가 마지막 줄을 가리지 않게. PC는 가운데 960 · 위 20(`1554:105203` 안쪽 20/240) */
export const page = style({
  paddingTop: vars.space[2],
  paddingBottom: fabClearance.md,
  '@media': {
    [media.desktop]: {
      maxWidth: 960 + 32 * 2,
      paddingLeft: 32,
      paddingRight: 32,
      paddingTop: 20,
      paddingBottom: vars.space[10],
    },
  },
});

/** PC 제목 줄(DS Top app bar 64 → 목록 위 24, `1554:105193` · `1496:12657` 안쪽 24). 모바일은 셸 하위 화면 헤더 */
export const desktopTitle = style({
  display: 'none',
  '@media': { [media.desktop]: { display: 'block', marginBottom: vars.space[5] } },
});

/** DS Top app bar 오른쪽 여백 24를 없앤다 — [공연 추가하기]가 960 칸 오른쪽 끝(`1554:105204` x 1070~1200) */
export const desktopHeader = style({ selectors: { '&&': { paddingRight: 0 } } });

/** [+ 공연 추가하기] — 링크에 버튼 모양 */
export const addLink = style({ textDecoration: 'none' });

/** 버튼 아이콘 18(GUI `I1554:105204;1504:13179;36:69`) */
export const addIcon = style({ width: 18, height: 18 });

/** 2열 · 사이 16 · 줄 사이 24(GUI `1423:2673` 163 두 장, 줄 119 → 425). PC는 163 칸을 왼쪽부터(`1496:12657` — 960에 5장) */
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
      [media.desktop]: { gridTemplateColumns: 'repeat(auto-fill, 163px)' },
    },
  },
]);

/** 로딩 자리 포스터 — DS ConcertCard 포스터 비율(163:231) */
export const skeletonPoster = style({ width: '100%', aspectRatio: '163 / 231' });

/** 오른쪽 아래 [+] — 호스트 홈과 같은 자리. PC는 제목 줄의 [공연 추가하기](`1496:12596`) */
export const fab = style({
  position: 'fixed',
  right: vars.space[5],
  bottom: fabBottom,
  zIndex: vars.zIndex.header,
  textDecoration: 'none',
  '@media': { [media.desktop]: { display: 'none' } },
});
