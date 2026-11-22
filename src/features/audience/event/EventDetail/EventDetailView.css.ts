import { style } from '@vanilla-extract/css';

import { HEADER_HEIGHT, TOP_BAR_HEIGHT } from '@/ui/theme/bars';
import { media } from '@/ui/theme/breakpoints';
import { colors } from '@/ui/theme/colors';
import { sprinkles } from '@/ui/theme/sprinkles.css';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 공연 상세 — 모바일 GUI `759:12772` · `1948:25129`(Ready 2026-11-22), PC 와이어 `640:1957`(두 열 — PC Ready 없음).
 * 서버 · 클라이언트가 같은 DOM을 그리고 모바일/PC에서 보일 것은 CSS가 정한다(patterns §1).
 *
 * 모바일 구조: 포스터가 머리 아래에 붙어 있고(sticky) 그 위로 흰 판이 스크롤해 올라온다. 흰 판은 한 덩어리가 아니라
 * 정보(`sheetTop`) · 티켓 · 탭 · 판매정보(`sheetPart`)가 각자 흰 바탕 + 화면 폭이라 사이로 포스터가 비치지 않는다
 * (PC 두 열 배치와 DOM을 같이 쓰려고). 포스터의 sticky 범위가 글 전체(`mainCol`)가 되게 모바일에서는 `summary`를 `contents`로 푼다.
 */

const MOBILE_GUTTER = 24; // Container 모바일 좌우 여백(Figma Mobile 그리드) — 화면 폭 요소가 이만큼 밖으로 나간다

export const mobileOnly = style({ '@media': { [media.desktop]: { display: 'none' } } });
export const desktopOnly = style({
  display: 'none',
  '@media': { [media.desktop]: { display: 'block' } },
});

export const page = style({
  '@media': { [media.desktop]: { paddingTop: vars.space[7], paddingBottom: vars.space[9] } },
});

/** PC 두 열 — 왼쪽 본문 + 오른쪽 고정 카드 382(와이어 `640:1957`) */
export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  '@media': {
    [media.desktop]: {
      gridTemplateColumns: 'minmax(0, 1fr) 382px',
      columnGap: vars.space[5],
      alignItems: 'start',
    },
  },
});

export const mainCol = style({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  '@media': { [media.desktop]: { gap: vars.space[6] } },
});

/** 포스터 + 요약. 모바일은 풀어서(`contents`) 포스터가 글 전체 범위에서 붙어 있게, PC는 포스터 282 옆에 정보 표 */
export const summary = style({
  display: 'contents',
  '@media': { [media.desktop]: { display: 'flex', flexDirection: 'row', gap: vars.space[5] } },
});

/**
 * 포스터 — 모바일은 화면 폭 390 × 551(GUI `759:13002`, 비율 282:400과 같다) · 모서리 없음 · 머리(64) 아래 고정
 * (디자이너 메모 `759:12772` "포스터는 고정"). PC는 282 · 모서리 8(와이어)
 */
export const posterWrap = style({
  position: 'sticky',
  top: HEADER_HEIGHT,
  zIndex: 0,
  marginInline: -MOBILE_GUTTER,
  aspectRatio: '282 / 400',
  overflow: 'hidden',
  background: vars.color.surface.imageBg,
  flexShrink: 0,
  '@media': {
    [media.desktop]: {
      position: 'relative',
      top: 'auto',
      marginInline: 0,
      width: 282,
      borderRadius: vars.radius[2],
    },
  },
});

/**
 * 포스터는 칸(282:400)에 맞춰 줄이고 자르지 않는다(`contain`) — 3:4 포스터를 `cover`로 채우면 좌우 글자가 잘렸다
 * (이슈 #93 §1 'GOSROCK' → 'OSROCK'). 남는 칸은 `posterWrap`의 이미지 바탕색(Q65)
 */
export const poster = style({
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'contain',
});

/** 모바일 포스터 오른쪽 위 공유 버튼(와이어 `121:1216` 자리 — GUI에 없음) */
export const posterShare = style({
  position: 'absolute',
  top: vars.space[3],
  right: vars.space[3],
  '@media': { [media.desktop]: { display: 'none' } },
});

/** 흰 판 조각(모바일) — 화면 폭 · 흰 바탕 · 위 20(GUI 판 안 간격 20). PC는 아무것도 하지 않는다 */
export const sheetPart = style({
  position: 'relative',
  zIndex: 1,
  marginInline: -MOBILE_GUTTER,
  paddingInline: MOBILE_GUTTER,
  paddingTop: 20,
  background: vars.color.background.normal,
  // 조각 사이 소수점 반올림으로 생기는 1px 틈에 포스터가 비치지 않게 위로 1px 덮는다
  boxShadow: `0 -1px 0 ${vars.color.background.normal}`,
  '@media': {
    [media.desktop]: {
      position: 'static',
      marginInline: 0,
      paddingInline: 0,
      paddingTop: 0,
      boxShadow: 'none',
    },
  },
});

/** 마지막 조각 — 하단 바 위 여백 */
export const sheetEnd = style({
  paddingBottom: vars.space[6],
  '@media': { [media.desktop]: { paddingBottom: 0 } },
});

/**
 * 흰 판 맨 위(정보) — 포스터에 20 겹쳐 올라온다 · 위 모서리 20 · 위로 그림자 y −4 blur 6 15% · 안쪽 위 32(GUI `759:13003`)
 */
export const sheetTop = style({
  position: 'relative',
  zIndex: 1,
  marginTop: -20,
  marginInline: -MOBILE_GUTTER,
  padding: `${vars.space[6]} ${MOBILE_GUTTER}px 0`,
  borderTopLeftRadius: vars.radius[6],
  borderTopRightRadius: vars.radius[6],
  background: vars.color.background.normal,
  boxShadow: `0 -4px 6px ${vars.color.overlay.shadow}`,
  '@media': {
    [media.desktop]: {
      marginTop: 0,
      marginInline: 0,
      padding: 0,
      borderRadius: 0,
      boxShadow: 'none',
    },
  },
});

/** 제목 — 모바일 가운데(GUI `759:13005`) */
export const title = style({
  margin: 0,
  textAlign: 'center',
  '@media': { [media.desktop]: { textAlign: 'left' } },
});

/** 정보 — 모바일 덩어리 사이 20(제목 · 칩 · 아이콘 행), PC 16 */
export const info = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  flex: 1,
  minWidth: 0,
  '@media': { [media.desktop]: { gap: vars.space[4] } },
});

/** 아이콘 행 사이 8(GUI `759:13011`) */
export const infoRows = style({ display: 'flex', flexDirection: 'column', gap: vars.space[2] });

export const chips = style([sprinkles({ listStyle: 'none' }), { margin: 0, padding: 0 }]);

/** 아이콘 24 + 글자(16 · `text/primary`) 사이 8, 오른쪽 끝 › 24 */
export const iconRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
  minHeight: 24,
  color: vars.color.text.primary,
  textDecoration: 'none',
  minWidth: 0,
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

export const iconRowText = style({ flex: 1, minWidth: 0 });

export const desktopTable = style({
  display: 'none',
  '@media': {
    [media.desktop]: {
      display: 'flex',
      flexDirection: 'column',
      paddingTop: vars.space[2],
      paddingBottom: vars.space[2],
      borderTop: `1px solid ${vars.color.surface.defaultBorder}`,
      borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
    },
  },
});

export const hostValue = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  flexWrap: 'wrap',
});

export const textLink = style({ color: 'inherit', textDecoration: 'underline' });

/** 모바일 티켓 카드 · PC 오른쪽 카드 — 테두리 상자(와이어). 그림자는 짓지 않는다 */
export const card = style({
  border: `1px solid ${vars.color.surface.defaultBorder}`,
  borderRadius: vars.radius[4],
  padding: vars.space[4],
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
});

export const aside = style([
  card,
  {
    display: 'none',
    '@media': {
      [media.desktop]: {
        display: 'flex',
        gap: vars.space[4],
        padding: vars.space[5],
        position: 'sticky',
        // 고정 상단 바(58) 아래 + space[5](fix-qa-1101)
        top: `calc(${TOP_BAR_HEIGHT}px + ${vars.space[5]})`,
        // 낮은 PC 화면(1024×600 등)에서 카드가 화면보다 길면 아래 [티켓 구매하기]가 페이지 끝까지 안 보였다 — 화면 안에 묶고
        // 넘치면 카드 안에서 스크롤(이슈 #95, EventScopeNav 사이드바와 같은 방식)
        maxHeight: `calc(100dvh - ${TOP_BAR_HEIGHT}px - ${vars.space[5]} * 2)`,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
      },
    },
  },
]);

/** 탭 본문 — 탭과 20, 머리 · 본문 16(GUI `759:13065`) */
export const tabPanel = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  paddingTop: 20,
  '@media': { [media.desktop]: { paddingTop: vars.space[5] } },
});

/**
 * 모바일 아래 고정 묶음 — 고른 티켓 줄 + [문의][티켓 구매하기] + 맨 위로. 흐름 안 sticky라 본문 끝이 가리지 않는다(자리를 따로 두지 않음).
 * PC에서는 숨긴다(같은 DOM)
 */
export const dock = style({
  position: 'sticky',
  bottom: 0,
  zIndex: 10,
  marginInline: -MOBILE_GUTTER,
  '@media': { [media.desktop]: { display: 'none' } },
});

/** 맨 위로(↑) — 묶음 바로 위 오른쪽 24(GUI `759:12838` · `1461:10613`). 공연홈 버튼의 화면 고정 자리를 이 묶음 기준으로 바꾼다 */
export const scrollTop = style({
  selectors: {
    [`${dock} &`]: {
      position: 'absolute',
      right: MOBILE_GUTTER,
      bottom: `calc(100% + ${vars.space[5]})`,
    },
  },
});

/** 고른 티켓 줄 — 흰 바탕 · 위 테두리 · 안쪽 16/24(GUI `759:22112`) */
export const pickedBar = style({
  padding: `${vars.space[4]} ${MOBILE_GUTTER}px`,
  borderTop: `1px solid ${vars.color.surface.defaultBorder}`,
  background: vars.color.background.normal,
});

/** 하단 바 [문의][티켓 구매하기] — 흰 바탕 · 위 테두리 · 안쪽 16/24(GUI `759:14901`) + 안전 영역 */
export const bottomBar = style({
  padding: `${vars.space[4]} ${MOBILE_GUTTER}px`,
  paddingBottom: `calc(${vars.space[4]} + env(safe-area-inset-bottom))`,
  borderTop: `1px solid ${vars.color.surface.defaultBorder}`,
  background: vars.color.background.normal,
});

/** [문의 56][티켓 구매하기] — 화면 하단 바 사이 8(`759:14902`), 시트 버튼 줄 사이 12(`1948:25358`) */
export const buyButtons = style({ display: 'flex', gap: vars.space[2], width: '100%' });
export const buyButtonsSheet = style({ gap: vars.space[3] });

/** 주간 달력 7칸(와이어 `640:1957`) */
export const week = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  rowGap: vars.space[2],
  textAlign: 'center',
  paddingBottom: vars.space[4],
  borderBottom: `1px solid ${vars.color.surface.strongBorder}`,
});

export const weekDay = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  margin: '0 auto',
  borderRadius: vars.radius.full,
  selectors: {
    '&[data-event-day]': { background: vars.color.brand.primary, color: vars.color.text.onBrand },
  },
});

/** 섹션이 많으면(서버 상한 10) 탭 줄만 가로로 스크롤한다 — 페이지가 옆으로 밀리지 않게. 스크롤하면 위에 붙는다 */
export const tabList = style({
  // 스크롤하면 머리 아래 붙는다(GUI `1948:25129` "공연상세(스크롤)", #340) — 본문은 그 아래에서 스크롤
  position: 'sticky',
  top: HEADER_HEIGHT,
  zIndex: 2,
  background: vars.color.background.normal,
  '@media': { [media.desktop]: { top: TOP_BAR_HEIGHT } },
  overflowX: 'auto',
  overflowY: 'hidden',
  scrollbarWidth: 'none',
  selectors: { '&::-webkit-scrollbar': { display: 'none' } },
});

/**
 * 취소된 공연 안내(E-11 — 이슈 #136 §7). 디자인 · 와이어 없음(design-requests Q125) — 회색 상자 + 빨간 제목 한 줄 + 사유.
 * 제목 아래, 모바일 · PC 같은 DOM
 */
export const canceledNotice = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  padding: vars.space[4],
  borderRadius: vars.radius[2],
  background: colors.surfaceContainer,
});
