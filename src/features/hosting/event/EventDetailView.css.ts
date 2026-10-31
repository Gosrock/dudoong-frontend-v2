import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 상세 정보 — 모바일(GUI `767:39585`): 좌우 24, 안내 2줄 → 탭(44h, 위 24). PC(`767:39645`): 위 28(→ 24) · 좌우 24,
 * 제목 `Heading/lg-emphasized` + 안내 한 줄 → 탭(48h, 아래 선 #F7F7F6).
 */
export const page = style({ display: 'flex', flexDirection: 'column', flex: '1 0 auto' });

export const body = style({
  flex: '1 0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[5],
  padding: `${vars.space[3]} ${vars.space[5]} ${vars.space[6]}`,
  '@media': { [media.desktop]: { padding: vars.space[5] } },
});

export const head = style({ display: 'flex', flexDirection: 'column', gap: vars.space[1] });

export const desktopTitle = style({
  margin: 0,
  display: 'none',
  '@media': { [media.desktop]: { display: 'block' } },
});

/** 모바일 두 줄 · PC 한 줄 */
export const description = style({
  whiteSpace: 'pre-line',
  '@media': { [media.desktop]: { whiteSpace: 'normal' } },
});

/** 탭 줄 + 추가(+) — 아래 선 #F7F7F6(GUI `tab` 테두리 = `surface.container`). 탭이 많으면 가로 스크롤 */
export const tabRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[4],
  borderBottom: `1px solid ${vars.color.surface.container}`,
});

export const tabList = style({ minWidth: 0, overflowX: 'auto', scrollbarWidth: 'none' });

export const panel = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  paddingTop: vars.space[5],
  // Radix가 고르지 않은 탭에 `hidden`을 단다 — display를 덮어쓰지 않게
  selectors: { '&[hidden]': { display: 'none' } },
});

export const titleRow = style({ display: 'flex', alignItems: 'flex-start', gap: vars.space[2] });
export const titleInput = style({
  flex: '1 1 auto',
  minWidth: 0,
  '@media': { [media.desktop]: { flex: '0 1 360px' } },
});

export const preview = style({ minHeight: 240 });
