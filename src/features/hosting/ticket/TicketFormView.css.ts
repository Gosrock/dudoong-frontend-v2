import { globalStyle, style } from '@vanilla-extract/css';

import { mobileHeader } from '@/features/hosting/event/ui/EventScopeNav.css';
import { EVENT_SCOPE_ATTR } from '@/features/hosting/shell/HostingShell.css';
import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 이 화면(모바일)은 공연 헤더("티켓 관리 ▾") 대신 ← 제목 헤더를 쓴다(GUI `767:46671` Top app bar `only title`).
 * 폼이 보이는 동안만 공연 스코프 틀에 이 속성을 건다(`useHideEventHeader`) — `:has()`로 하면 Cache Components가 숨겨 둔
 * 이전 화면(React Activity)에도 맞아 목록으로 돌아와도 헤더가 숨는다
 */
export const HIDE_HEADER_ATTR = 'data-hide-event-header';
globalStyle(`[${EVENT_SCOPE_ATTR}][${HIDE_HEADER_ATTR}] .${mobileHeader}`, { display: 'none' });

/**
 * 새 티켓 만들기 · 티켓 수정 — 모바일(GUI `767:46560`·`767:46664`·`821:23712`): 좌우 24 · 위 12, 칸 묶음 위아래 16 · 사이 16.
 * PC(`821:25116`·`821:25649`): 위 28(→ 24) · 좌우 24, "< 티켓 관리" + 제목 `Heading/lg-emphasized`, 1280~ 두 열 — 왼쪽 칸 | 48 | 오른쪽 회색 판 557
 * (토글 넷 + 판매 기간, 모서리 20 · 채움 `surface/container`, 토글 사이 선). 1024~1279는 한 열(최대 600 — 기본 정보와 같음)
 */
export const page = style({ display: 'flex', flexDirection: 'column', flex: '1 0 auto' });

export const mobileOnly = style({ '@media': { [media.desktop]: { display: 'none' } } });

export const body = style({
  flex: '1 0 auto',
  padding: `${vars.space[3]} ${vars.space[5]} ${vars.space[6]}`,
  '@media': { [media.desktop]: { padding: `${vars.space[5]} ${vars.space[5]} ${vars.space[7]}` } },
});

/** PC 머리 — "< 티켓 관리" + 제목. 모바일은 헤더가 제목을 맡는다 */
export const desktopHead = style({
  display: 'none',
  '@media': {
    [media.desktop]: {
      display: 'flex',
      flexDirection: 'column',
      gap: vars.space[1],
      paddingBottom: vars.space[5],
    },
  },
});

export const crumb = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[1],
  alignSelf: 'flex-start',
  color: vars.color.text.secondaryLabel,
  textDecoration: 'none',
  selectors: { '&:hover': { color: vars.color.text.primaryLabel } },
});

/** 제목 h1 — PC는 머리 안에 보이고, 모바일은 헤더(`p`)가 글자를 맡아 화면 읽기 도구에만 남긴다(P14 접근성) */
export const title = style({
  margin: 0,
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
      display: 'flex',
      flexDirection: 'column',
      gap: vars.space[1],
      paddingBottom: vars.space[5],
    },
  },
});

export const notices = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  paddingBottom: vars.space[2],
});

export const columns = style({
  display: 'flex',
  flexDirection: 'column',
  '@media': {
    [media.desktop]: { maxWidth: 600 },
    [media.desktopS]: {
      maxWidth: 'none',
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 557px)',
      columnGap: vars.space[7],
      alignItems: 'start',
    },
  },
});

export const left = style({ display: 'flex', flexDirection: 'column', minWidth: 0 });

/** 오른쪽 판 — 모바일은 배경 없이 칸 묶음, 1280~ 회색 판(패딩 20 → 24 · 모서리 20) */
export const right = style({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  '@media': {
    [media.desktopS]: {
      padding: `${vars.space[2]} ${vars.space[5]}`,
      borderRadius: vars.radius[6],
      background: vars.color.surface.container,
    },
  },
});

/** PC 판 안 토글 사이 선(`821:25747` 테두리 `surface/default-border`) */
globalStyle(`${right} > *:not(:last-child)`, {
  '@media': {
    [media.desktopS]: { borderBottom: `1px solid ${vars.color.surface.defaultBorder}` },
  },
});

/** 라디오 줄(간격 34 → 32) */
export const radios = style({ display: 'flex', alignItems: 'center', gap: vars.space[6] });

/** 판매 수량: [무제한] [수량 지정 | 0 장] — 모바일 한 줄 */
export const supplyRow = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: vars.space[6],
  '@media': { [media.desktopS]: { gap: vars.space[4] } },
});

globalStyle(`${supplyRow} label`, { whiteSpace: 'nowrap' });

export const supplyCount = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  '@media': { [media.desktopS]: { gap: vars.space[2] } },
});

/** 금액·수량 칸 195(GUI `767:46709`) · 수량 지정 칸 136(`767:46723` 근사) */
export const narrow = style({ width: 195, maxWidth: '100%' });
export const count = style({
  width: 136,
  '@media': { [media.desktopS]: { width: 88 } },
});

/** 1280~ 가격 | 판매 수량 두 칸 한 줄(`821:25116`) */
export const priceSupply = style({
  display: 'flex',
  flexDirection: 'column',
  '@media': {
    [media.desktopS]: {
      display: 'grid',
      gridTemplateColumns: 'auto minmax(0, 1fr)',
      columnGap: vars.space[6],
    },
  },
});

/** 계좌: [은행 | 예금주] + 계좌번호(간격 10 → 8) */
export const account = style({ display: 'flex', flexDirection: 'column', gap: vars.space[2] });
export const accountRow = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: vars.space[2],
});

/** 판매 기간 상자 — 모바일 회색(`767:46768` 모서리 16 · 패딩 12 16 24 · 간격 16), PC는 판 안이라 배경 없음 */
export const period = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  padding: `${vars.space[3]} ${vars.space[4]} ${vars.space[5]}`,
  borderRadius: vars.radius[5],
  background: vars.color.surface.container,
  '@media': { [media.desktopS]: { padding: 0, background: 'transparent' } },
});

export const periodRow = style({ display: 'flex', flexDirection: 'column', gap: vars.space[2] });

export const periodHead = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
  minHeight: 38,
});

export const dateTime = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: vars.space[2],
});

/** 하단 바 — 모바일 위아래 36(→ 32) · 좌우 24 Large 꽉, PC 위 선 + 오른쪽 Primary medium 342(`821:25779`) */
export const bottomBar = style({
  position: 'sticky',
  bottom: 0,
  zIndex: 1,
  marginTop: 'auto',
  background: vars.color.background.normal,
  padding: `${vars.space[6]} ${vars.space[5]}`,
  paddingBottom: `calc(${vars.space[6]} + env(safe-area-inset-bottom))`,
  '@media': {
    [media.desktop]: {
      display: 'flex',
      justifyContent: 'flex-end',
      padding: vars.space[5],
      borderTop: `1px solid ${vars.color.surface.defaultBorder}`,
    },
  },
});

export const saveButton = style({
  '@media': {
    [media.desktop]: {
      selectors: { '&&': { width: 342, height: 46, borderRadius: vars.radius[3] } },
    },
  },
});
