import { globalStyle, style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * QR 체크인 — **와이어 근거**(`424:11941` 호스트가 스캔 · `424:11976` 관객이 스캔 · `108:4656`·`108:4693` 전체화면).
 * 위에서부터 통계 3칸 → 막대 + "n% 입장 완료" → 모드 전환 → 카메라/QR 자리(모서리 큰 회색 상자) → [전체화면 전환](오른쪽).
 * 와이어 값은 옮기지 않고 토큰으로(design-workflow §3). PC는 본문 폭을 줄여 가운데 없이 왼쪽에 둔다(기본 정보·예매자 관리와 같은 머리).
 */
export const page = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[5],
  width: '100%',
  maxWidth: 640,
  boxSizing: 'border-box',
  padding: `${vars.space[5]} ${vars.space[5]} ${vars.space[6]}`,
  '@media': { [media.desktop]: { padding: `${vars.space[5]} ${vars.space[5]} ${vars.space[7]}` } },
});

/** PC만 — 모바일은 헤더 제목("QR 체크인 ▾")이 대신한다(예매자 관리 `desktopTitle`과 같다) */
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

/* ── 통계 ─────────────────────────────────────────── */

export const statGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: vars.space[2],
  margin: 0,
});

/** 와이어의 회색 칸(모서리 둥근 상자) — 라벨 위, 숫자 아래, 가운데 정렬 */
export const statBox = style({
  display: 'flex',
  flexDirection: 'column-reverse',
  alignItems: 'center',
  gap: vars.space[1],
  padding: `${vars.space[4]} ${vars.space[2]}`,
  borderRadius: vars.radius[4],
  background: vars.color.surface.container,
  margin: 0,
});

export const statValue = style({ margin: 0 });

export const track = style({
  position: 'relative',
  height: 10,
  overflow: 'hidden',
  borderRadius: vars.radius[7],
  background: vars.color.surface.defaultBorder,
});

/** 채움 — 대시보드 `입장 현황` 막대와 같은 색(brand/primary) */
export const fill = style({
  position: 'absolute',
  insetBlock: 0,
  left: 0,
  background: vars.color.brand.primary,
});

export const statsError = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.space[2],
});

/* ── 스캔·QR 자리 ─────────────────────────────────── */

export const panel = style({ display: 'flex', flexDirection: 'column', gap: vars.space[3] });

/** 카메라/QR 자리. 와이어 `424:11941`의 세로로 긴 회색 상자(약 4:5) */
export const stage = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  aspectRatio: '4 / 5',
  // dvh — iOS `vh`는 툴바를 뺀 큰 뷰포트라 툴바가 보일 때 넘쳤다(이슈 #95)
  maxHeight: '70dvh',
  overflow: 'hidden',
  borderRadius: vars.radius[6],
  background: vars.color.background.grey,
  // PC는 와이어가 없다 — 결과 카드까지 한 화면에 보이게 가로로 조금 넓게
  '@media': { [media.desktop]: { aspectRatio: '4 / 3' } },
});

/** 전체화면(와이어 `108:4656` 카메라 · `108:4693` QR) — 셸·상단 바를 덮는다. 뒤로가기·[‹]로 닫는다 */
export const stageFullscreen = style({
  position: 'fixed',
  inset: 0,
  zIndex: vars.zIndex.modal,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  // 덮은 채로 끌어도 뒤 문서가 스크롤·고무줄 되지 않게(이슈 #95) — 탭(버튼)은 그대로 된다
  touchAction: 'none',
  overscrollBehavior: 'none',
  background: vars.color.background.grey,
});

/** 관객이 스캔 — 흰 바탕(와이어 `108:4693`) */
export const stageLight = style({ background: vars.color.background.normal });

export const closeFullscreen = style({
  position: 'absolute',
  top: vars.space[3],
  left: vars.space[3],
  zIndex: 2,
});

export const fullscreenRow = style({ display: 'flex', justifyContent: 'flex-end' });

/* ── 카메라 ───────────────────────────────────────── */

export const scannerContainer = style({ position: 'absolute', inset: 0 });
globalStyle(`${scannerContainer} video`, { width: '100%', height: '100%', objectFit: 'cover' });
export const scannerVideo = style({ width: '100%', height: '100%', objectFit: 'cover' });

export const cameraProblem = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  padding: vars.space[5],
  boxSizing: 'border-box',
  textAlign: 'center',
});

export const problemIcon = style({
  display: 'inline-flex',
  color: vars.color.text.secondary,
});
globalStyle(`${problemIcon} > svg`, { width: 48, height: 48 });

/** 판독 결과 — 카메라 위 아래쪽에 겹친다(전체화면에서도 보이게) */
export const resultDock = style({
  position: 'absolute',
  left: vars.space[3],
  right: vars.space[3],
  bottom: vars.space[3],
  zIndex: 1,
  display: 'flex',
  justifyContent: 'center',
});

export const resultCard = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  width: '100%',
  maxWidth: 480,
  boxSizing: 'border-box',
  padding: vars.space[4],
  borderRadius: vars.radius[5],
  background: vars.color.background.normal,
  boxShadow: `0 4px 16px ${vars.color.overlay.shadow}`,
});

export const hint = style({
  padding: `${vars.space[2]} ${vars.space[4]}`,
  borderRadius: vars.radius.full,
  background: vars.color.overlay.dim,
  color: vars.color.text.inverse,
});

export const toneIcon = style({ display: 'inline-flex', flexShrink: 0 });

export const ticketList = style({
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  columnGap: vars.space[3],
  rowGap: vars.space[1],
  margin: 0,
});
globalStyle(`${ticketList} dd`, { margin: 0, minWidth: 0, overflowWrap: 'anywhere' });

/* ── 관객이 스캔(QR) ──────────────────────────────── */

/** QR 둘레 흰 여백(quiet zone) — 와이어의 진한 회색 자리 대신 흰 카드 */
export const qrCard = style({
  display: 'flex',
  padding: vars.space[4],
  borderRadius: vars.radius[5],
  background: vars.color.background.normal,
});

export const qrImage = style({ width: 'min(240px, 60vw)' });
export const qrImageLarge = style({ width: 'min(70vw, 60dvh, 480px)' });

export const qrCaption = style({ maxWidth: 280 });
