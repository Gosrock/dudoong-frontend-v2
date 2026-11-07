import { globalStyle, style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { sprinkles } from '@/ui/theme/sprinkles.css';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 공연 대시보드(등록 전) — GUI Ready 모바일 `727:23088`·`745:32167`(390) · PC `727:23210`(1440, 가운데 1172, 우측 패널 없음).
 * 모바일은 가운데 정렬 한 열(포스터 → 호스트 · 공연명 → 체크리스트 → 유의사항), PC는 머리(포스터 + 정보 4줄, 아래 선) 아래 체크리스트.
 * 간격은 Figma 값 그대로(토큰에 없는 28 · 36 · 26 · 22 · 20 · 10 포함 — 분류표 H1 · H2, M-4 2026-11-08).
 * 아래 여백 — 모바일 10(GUI 본문 묶음 `727:23105` 아래 10), PC는 유의사항 아래 28뿐
 */
export const page = style({
  display: 'flex',
  flexDirection: 'column',
  paddingBottom: 10,
  '@media': { [media.desktop]: { paddingBottom: 0 } },
});

/** 모바일 본문 좌우 36(GUI `669:2803` · `727:23105` 좌우 36 — H1). 머리 글자 줄은 24 그대로 */
const MOBILE_SIDE = 36;
/** PC 묶음 위아래 28(GUI `727:23242` · `727:23264` · `712:1699` · `712:1705` — H2) */
const DESKTOP_BLOCK = 28;

/**
 * 머리 — 모바일: 위 24 · 가운데 정렬, 포스터 ↔ 글자 24(+ 글자 묶음 위 4) / PC: 위아래 28 · 좌 24 · 우 16, 포스터 ↔ 글자 26,
 * 아래 선 #F7F7F6(GUI `727:23242` · `727:23243`)
 */
export const head = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.space[5],
  padding: `${vars.space[5]} ${vars.space[5]} 0`,
  '@media': {
    [media.desktop]: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 26,
      padding: `${DESKTOP_BLOCK}px ${vars.space[4]} ${DESKTOP_BLOCK}px ${vars.space[5]}`,
      borderBottom: `1px solid ${vars.color.surface.container}`,
    },
  },
});

/** 포스터 — 모바일 180×254 · 모서리 10 / PC 176×248 · 모서리 9.8(GUI `727:23244` r9.78 — 값 그대로, H2), 오른쪽 위에 상태 칩 */
export const posterBox = style({
  position: 'relative',
  flexShrink: 0,
  width: 180,
  '@media': { [media.desktop]: { width: 176 } },
});

export const poster = style({
  display: 'block',
  width: '100%',
  // 일러스트 `<svg height>`가 비율을 덮지 않게(PC 176 폭에서 254 높이로 그려졌다)
  height: 'auto',
  aspectRatio: '180 / 254',
  borderRadius: vars.radius[3],
  '@media': { [media.desktop]: { aspectRatio: '176 / 248', borderRadius: 9.8 } },
  objectFit: 'cover',
  background: vars.color.surface.imageBg,
});

/** 칩 — 포스터 안 오른쪽 위(모바일 GUI 위 15 · 오른쪽 15 → 16) */
export const posterChip = style({
  position: 'absolute',
  top: vars.space[4],
  right: vars.space[4],
});

/**
 * 글자 묶음 — 모바일: 위 4 · 아래 12, 호스트 ↔ 공연명 2(GUI `727:23099`) / PC: 포스터 높이 안에서 세로 가운데,
 * 호스트 ↔ 공연명 4(GUI `727:23246` — 위 37.5는 가운데 정렬의 결과)
 */
export const info = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2,
  minWidth: 0,
  padding: `${vars.space[1]} 0 ${vars.space[3]}`,
  textAlign: 'center',
  '@media': {
    [media.desktop]: {
      alignItems: 'flex-start',
      justifyContent: 'center',
      gap: vars.space[1],
      padding: 0,
      textAlign: 'left',
    },
  },
});

/** 일자·시간·장소·태그 4줄 — PC에만(모바일 GUI에는 없다). 라벨 칸 + 값 칸, 간격 12 · 줄 간격 4 */
export const facts = style({
  display: 'none',
  '@media': {
    [media.desktop]: {
      display: 'grid',
      gridTemplateColumns: 'auto minmax(0, 1fr)',
      columnGap: vars.space[3],
      rowGap: vars.space[1],
      marginTop: vars.space[3],
      marginBlockEnd: 0,
    },
  },
});

/** 연필(기본 정보로) — PC 머리 오른쪽 위 34×34 검정 원(GUI `727:23261`). 모바일 GUI에는 없다 */
export const edit = style({
  display: 'none',
  '@media': {
    [media.desktop]: {
      display: 'inline-flex',
      position: 'absolute',
      top: vars.space[5],
      right: vars.space[4],
    },
  },
});

/**
 * 체크리스트 자리 — 모바일 좌우 36 · 위 22(머리 묶음 사이 12 + 본문 묶음 위 10 — GUI `727:23105`),
 * PC 위아래 28 · 좌우 24(`727:23264`)
 */
export const checklistWrap = style({
  padding: `22px ${MOBILE_SIDE}px 0`,
  '@media': {
    [media.desktop]: { padding: `${DESKTOP_BLOCK}px ${vars.space[5]}` },
  },
});

/** `필수 체크리스트`(DS `627:1799`) — 배경 #F7F7F6, 모서리 20, 패딩 위아래 24 · 좌우 20(값 그대로 — H2), 간격 8 */
export const checklist = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  padding: `${vars.space[5]} 20px`,
  borderRadius: vars.radius[6],
  background: vars.color.surface.container,
});

export const checkRows = style([
  sprinkles({ listStyle: 'none' }),
  {
    display: 'flex',
    flexDirection: 'column',
    gap: vars.space[1],
    margin: 0,
    padding: `${vars.space[3]} 0`,
  },
]);

/** 행 — 위아래 4, 체크 20 + 간격 14(→12) + 글자 `Label/md`, 오른쪽 ›(모바일은 줄 끝, PC는 글자 옆) */
export const checkRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  padding: `${vars.space[1]} 0`,
  color: vars.color.text.primaryLabel,
  textDecoration: 'none',
  borderRadius: vars.radius[2],
});

export const checkLabel = style({
  flex: '1 1 auto',
  '@media': { [media.desktop]: { flex: '0 1 auto' } },
});

/** 체크 원 — DS `Box`(Checkbox round) 모양만(행이 링크라 입력이 아니다). 빈 칸 테두리 `surface/default-border` · 찬 칸 검정 + ✓ */
export const checkMark = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 20,
  height: 20,
  boxSizing: 'border-box',
  borderRadius: vars.radius.full,
  border: `1.25px solid ${vars.color.surface.defaultBorder}`,
  color: vars.color.text.inverse,
  selectors: {
    '&[data-done="true"]': {
      background: vars.color.text.primaryLabel,
      borderColor: vars.color.text.primaryLabel,
    },
  },
});

/**
 * 유의사항 — 아이콘 16(칸 20) + 간격 12. 모바일: 위 24(묶음 사이 12 + 위 12) · 좌우 36 · 아래 28(GUI `727:23126` · `741:31929`),
 * PC: 위 12 · 좌우 24 · 아래 28(등록 전 `748:35527`)
 */
export const notice = style({
  display: 'flex',
  gap: vars.space[3],
  padding: `${vars.space[5]} ${MOBILE_SIDE}px ${DESKTOP_BLOCK}px`,
  '@media': {
    [media.desktop]: { padding: `${vars.space[3]} ${vars.space[5]} ${DESKTOP_BLOCK}px` },
  },
});

/** 등록 후 유의사항 — PC 왼쪽 28 · 오른쪽 0(GUI `748:33135`. 등록 전 `748:35527`은 24 · 24 — 화면대로) */
export const registeredNotice = style({
  '@media': { [media.desktop]: { paddingLeft: DESKTOP_BLOCK, paddingRight: 0 } },
});

export const noticeIcon = style({
  display: 'inline-flex',
  flexShrink: 0,
  width: 20,
  height: 20,
  alignItems: 'center',
  justifyContent: 'center',
});
globalStyle(`${noticeIcon} > svg`, { width: 16, height: 16 });

// ─── 등록 후(P13a-V) — GUI `669:2787`(모바일) · `712:1646`(1440) 등 ───

export const registered = style({ display: 'flex', flexDirection: 'column' });

/** 불러오는 중 · 실패 줄(디자인 없음) — 통계 카드 자리와 같은 여백 */
export const statsState = style({
  padding: `22px ${MOBILE_SIDE}px 0`,
  '@media': { [media.desktop]: { padding: `${DESKTOP_BLOCK}px ${vars.space[5]} 0` } },
});

/**
 * 통계 카드 — 모바일 2×2(줄 사이 12 · 칸 사이 8, 위 22 · 좌우 36 — GUI `669:2803`),
 * PC 한 줄 4개(위아래 28 · 좌우 24 · 간격 16 — `712:1699`)
 */
export const stats = style([
  sprinkles({ listStyle: 'none' }),
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: `${vars.space[3]} ${vars.space[2]}`,
    margin: 0,
    padding: `22px ${MOBILE_SIDE}px 0`,
    '@media': {
      [media.desktop]: {
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: vars.space[4],
        padding: `${DESKTOP_BLOCK}px ${vars.space[5]}`,
      },
    },
  },
]);

/**
 * 판매 · 입장 — 모바일 한 열(간격 12), PC 두 칸(간격 16 · 위아래 28 · 좌우 24, 위 선 #F7F7F6 — `712:1705`). 높이는 각자(입장 카드가 짧다)
 */
export const salesRow = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  alignItems: 'start',
  gap: vars.space[3],
  padding: `${vars.space[3]} ${MOBILE_SIDE}px 0`,
  '@media': {
    [media.desktop]: {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: vars.space[4],
      padding: `${DESKTOP_BLOCK}px ${vars.space[5]}`,
      borderTop: `1px solid ${vars.color.surface.container}`,
    },
  },
});

/**
 * 우측 일정 패널 본문(DS `일정 패널` `605:1951`) — 위아래 28 · 좌우 24(값 그대로 — H2 M-4 2026-11-08), 주간 줄 아래 19(값 그대로 —
 * A14 M-2 2026-11-08), 단계 사이 12
 */
export const panel = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 19,
  padding: `${DESKTOP_BLOCK}px ${vars.space[5]}`,
});

export const timeline = style([
  sprinkles({ listStyle: 'none' }),
  {
    display: 'flex',
    flexDirection: 'column',
    gap: vars.space[3],
    margin: 0,
    padding: 0,
  },
]);
