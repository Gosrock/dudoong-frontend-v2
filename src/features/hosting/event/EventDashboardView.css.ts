import { globalStyle, style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { sprinkles } from '@/ui/theme/sprinkles.css';
import { vars } from '@/ui/theme/tokens.css';
import { typographySpecs } from '@/ui/theme/typography.css';

/**
 * 공연 대시보드 — GUI Ready 등록 전 모바일 `727:23088`·`745:32167` · PC `1929:6181`~(Design Sync #333 · #334) / 등록 후 모바일 `669:2787` ·
 * PC `712:1646` 등(#321 · #327 — 2026-11-21 "컴포넌트 간격 토큰값으로 수정"). 모바일은 가운데 정렬 한 열(포스터 → 호스트 · 공연명 →
 * 본문), PC는 머리(포스터 + 정보 4줄, 아래 선) 아래 본문. 간격은 모두 토큰(32 · 24 · 16 · 12 · 8).
 */
export const page = style({ display: 'flex', flexDirection: 'column' });

/** 모바일 본문 좌우 32(GUI `669:2787` · `727:23088` 본문 묶음 좌우 32 — 2026-11-21, 전에는 36) */
const MOBILE_SIDE = vars.space[6];
/** PC 묶음 안쪽 24(GUI `712:1646` 머리 · 통계 · 판매 · 체크리스트 묶음 패딩 24 — 전에는 28) */
const DESKTOP_BLOCK = vars.space[5];

/** 머리 묶음 — 머리 줄 + (취소된 공연이면) 취소 안내. PC: 패딩 24 · 오른쪽 16, 간격 24, 아래 선 #F7F7F6(GUI `712:1646` · `1912:3661`) */
export const headBlock = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  '@media': {
    [media.desktop]: {
      gap: vars.space[5],
      padding: `${DESKTOP_BLOCK} ${vars.space[4]} ${DESKTOP_BLOCK} ${DESKTOP_BLOCK}`,
      borderBottom: `1px solid ${vars.color.surface.container}`,
    },
  },
});

/** 취소 안내 자리 — 모바일 좌우 32 · 아래 4(본문 위 8과 합쳐 12 — GUI `1912:4466`) */
export const canceledSlot = style({
  padding: `0 ${MOBILE_SIDE} ${vars.space[1]}`,
  '@media': { [media.desktop]: { padding: 0 } },
});

/**
 * 머리 줄 — 모바일: 위 16 · 가운데 정렬, 포스터 ↔ 글자 16(GUI `669:2787` 묶음 간격 16) / PC: 포스터 176 + 간격 24 + 정보
 */
export const head = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.space[4],
  padding: `${vars.space[4]} ${vars.space[5]} 0`,
  '@media': {
    [media.desktop]: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: vars.space[5],
      padding: 0,
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
 * 글자 묶음 — 모바일: 위 4 · 아래 12, 호스트 ↔ 공연명 2(GUI `669:2787` `Frame 1707480406`) / PC: 포스터 높이 안에서 세로 가운데,
 * 호스트 ↔ 공연명 4 · 공연명 ↔ 정보 16(GUI `712:1646` `Frame 1707480319` · `1707480387`)
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

/**
 * 호스트 이름 — 모바일 `Label/lg`(GUI `669:2799` · `727:23101` · `745:32176`, 16/120% 400), PC `Heading/sm`(`727:23247`, 16/130% 500).
 * `<Txt typography="labelLg">`에 PC만 덮어쓴다(분류표 H22, M-5 2026-11-08)
 */
const hostPc = typographySpecs.headingSm;
export const hostName = style({
  selectors: {
    '&&': {
      '@media': {
        [media.desktop]: {
          fontWeight: hostPc.weight,
          lineHeight: hostPc.lineHeight,
          letterSpacing: hostPc.letterSpacing,
          // GUI `712:1646` 호스트 줄 opacity 0.8
          opacity: 0.8,
        },
      },
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
      // 공연명 ↔ 정보 16(GUI `Frame 1707480387` 간격 16) — info 간격 4 + 12
    },
  },
});

/** 체크리스트 자리 — 모바일 위 12 · 좌우 32(GUI `727:23088` 본문 묶음) / PC 패딩 24(`1929:6181`) */
export const checklistWrap = style({
  padding: `${vars.space[3]} ${MOBILE_SIDE} 0`,
  '@media': {
    [media.desktop]: { padding: DESKTOP_BLOCK },
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
 * 유의사항 — 아이콘 16(칸 20) + 간격 12. 모바일: 위 24(묶음 사이 12 + 위 12) · 좌우 32 · 아래 24(GUI `669:2787` · `727:23088` `AL`),
 * PC: 위 12 · 좌우 24 · 아래 24(등록 전 `1929:6181`)
 */
export const notice = style({
  display: 'flex',
  gap: vars.space[3],
  padding: `${vars.space[5]} ${MOBILE_SIDE}`,
  '@media': {
    [media.desktop]: { padding: `${vars.space[3]} ${DESKTOP_BLOCK} ${DESKTOP_BLOCK}` },
  },
});

/** 등록 후 유의사항 — 모바일은 본문 묶음 안(좌우 0 · 위 12) / PC 오른쪽 0(GUI `712:1646` `AL` 12 · 0 · 24 · 24) */
export const registeredNotice = style({
  padding: `${vars.space[3]} 0 ${vars.space[5]}`,
  '@media': {
    [media.desktop]: { padding: `${vars.space[3]} 0 ${DESKTOP_BLOCK} ${DESKTOP_BLOCK}` },
  },
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

/** 모바일: 본문 묶음(위 8 · 좌우 32 · 간격 12 — GUI `669:2787` `Frame 1707480325`) / PC: 묶음마다 패딩 */
export const registered = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  padding: `${vars.space[2]} ${MOBILE_SIDE} 0`,
  '@media': { [media.desktop]: { gap: 0, padding: 0 } },
});

/** 통계 불러오기 실패(GUI `1887:2382` PC 패딩 24 · `1913:36842` 모바일) — 문구 + [다시 시도] 가운데 */
export const statsState = style({
  '@media': { [media.desktop]: { padding: DESKTOP_BLOCK } },
});

/**
 * 통계 카드 — 모바일 2×2(줄 사이 12 · 칸 사이 8 — GUI `669:2787`), PC 한 줄 4개(패딩 24 · 간격 16 — `712:1646`)
 */
export const stats = style([
  sprinkles({ listStyle: 'none' }),
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: `${vars.space[3]} ${vars.space[2]}`,
    margin: 0,
    padding: 0,
    '@media': {
      [media.desktop]: {
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: vars.space[4],
        padding: DESKTOP_BLOCK,
      },
    },
  },
]);

/**
 * 판매 · 입장 — 모바일 한 열(간격 12), PC 두 칸(간격 16 · 패딩 24, 위 선 #F7F7F6 — `712:1646`). 높이는 각자(입장 카드가 짧다)
 */
export const salesRow = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  alignItems: 'start',
  gap: vars.space[3],
  '@media': {
    [media.desktop]: {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: vars.space[4],
      padding: DESKTOP_BLOCK,
      borderTop: `1px solid ${vars.color.surface.container}`,
    },
  },
});

/** 유의사항 한 줄(아이콘 칸 + 글자) — 등록 후는 여백을 `registeredNotice`가 준다 */
export const noticeRow = style({ display: 'flex', gap: vars.space[3] });

/** PC 정보 값 — 글자 80%(GUI `712:1646` 값 줄 opacity 0.8) */
export const factValue = style({ margin: 0, opacity: 0.8 });

/** 체크리스트 불러오는 중 — 행 자리(높이 28 · 위아래 4)에 스켈레톤 160×20 모서리 6 #DDDCDA(GUI `1929:7153`) */
export const checkSkeleton = style({ display: 'flex', alignItems: 'center', height: 28 });
globalStyle(`${checkSkeleton} > span`, {
  borderRadius: 6,
  backgroundColor: vars.color.surface.defaultBorder,
});

/** 체크리스트 실패 — 행 자리(높이 116)에 가운데 문구 + [다시 시도](GUI `1929:7393`) */
export const checkError = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 116,
});
