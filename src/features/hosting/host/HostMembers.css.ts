import { globalStyle, style } from '@vanilla-extract/css';

import { fabBottom, fabClearance } from '@/ui/components/Fab/Fab.css';
import { media } from '@/ui/theme/breakpoints';
import { sprinkles } from '@/ui/theme/sprinkles.css';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 멤버 화면(`/hosting/hosts/[hostId]/members`) — **GUI 근거**(모바일 Design Sync #263~#266 · #268 · #269 · #282~#289,
 * PC 1440 #296~#298). PC(1024~)는 `1496:9302`: 머리 줄 · 본문 모두 960 가운데(1440에서 좌우 240), [+ 멤버 초대하기]는 머리 줄 오른쪽.
 */

/** PC 본문 폭(`1496:9302` `Frame 1707480466` — 1440 − 240 × 2) */
const DESKTOP_WIDTH = 960;

/** 머리 줄 — PC는 본문과 같은 960 가운데 · 위 20(`Frame 1707480466` p20 → `Top app bar` `1478:35703` 240,78 960×64) */
export const header = style({
  '@media': {
    [media.desktop]: {
      width: '100%',
      maxWidth: DESKTOP_WIDTH,
      marginInline: 'auto',
      paddingInline: 0,
      // FIGMA-CUSTOM: 위 20(`1496:9302` `Frame 1707480466` p20/240) — 토큰 스케일(16 · 24)에 없는 Figma 값 그대로
      marginTop: 20,
    },
  },
});

/** PC 머리 줄 [+ 멤버 초대하기](`1503:13110` 130×46) — 모바일은 FAB(`fab`)라 숨긴다 */
export const inviteButton = style({
  display: 'none',
  '@media': { [media.desktop]: { display: 'inline-flex' } },
});

/** 버튼 안 `ic_add` 18(`1503:13110` `ic` 18×18) — 아이콘 세트는 24만 있어 줄여 그린다(권한 표 ✓ 20과 같은 방식) */
globalStyle(`${inviteButton} svg`, { width: 18, height: 18 });

/** 본문(`1421:755` "본문") — 세로 간격 8 · 하단 FAB에 마지막 줄이 가리지 않게. PC는 960 가운데 · FAB 없음 */
export const body = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  width: '100%',
  paddingTop: vars.space[2],
  paddingBottom: fabClearance.lg,
  '@media': {
    [media.desktop]: {
      maxWidth: DESKTOP_WIDTH,
      marginInline: 'auto',
      paddingInline: 0,
      paddingBottom: vars.space[6],
    },
  },
});

/**
 * "ⓘ 멤버 권한에 대해서"(GUI 로컬 `멤버 권한이란` `1418:39693`) — 28h · 모서리 12 · 안쪽 6/10 · `surface/container` 채움.
 * FIGMA-CUSTOM: DS 밖에서 직접 그린 칩(GUI 컴포넌트 #269) → 커스텀 HostMembers.css.ts. DS 후보(design-system §3)
 */
export const guideChip = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[1],
  alignSelf: 'flex-start',
  height: 28,
  // 안쪽 6/10 — `1418:39693` p6/10, 토큰 스케일(4 · 8 · 12)에 없는 Figma 값 그대로
  padding: `6px 10px`,
  border: 'none',
  borderRadius: vars.radius[4],
  background: vars.color.surface.container,
  color: vars.color.text.primaryLabel,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: vars.color.surface.defaultLabel },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

export const list = style([
  sprinkles({ listStyle: 'none' }),
  { display: 'flex', flexDirection: 'column', gap: vars.space[2], margin: 0, padding: 0 },
]);

/**
 * 멤버 행(GUI 로컬 `멤버 행` `1421:752` — 안에 DS `List` Role tag=false + Avatar 60) — 76h · 위아래 8 · 아바타 ↔ 글자 12 ·
 * 행 ↔ ⋮ 4, ⋮ 칸 44. PC는 `프로필 크기=40`(`1546:19828` — 56h)
 */
export const memberRow = style({
  position: 'relative',
  isolation: 'isolate',
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[1],
  minHeight: 76,
  /**
   * `상태=호버`(`1504:13275` 등 — #269 뒤 디자이너가 더함): 행보다 좌우 12 넓은 `surface/container` 배경 · 모서리 12.
   * 포인터 기기만(터치에서 눌린 채 남지 않게)
   */
  '::before': {
    content: '""',
    position: 'absolute',
    inset: `0 calc(-1 * ${vars.space[3]})`,
    zIndex: -1,
    borderRadius: vars.radius[4],
    background: 'transparent',
  },
  '@media': {
    '(hover: hover)': {
      selectors: { '&:hover::before': { background: vars.color.surface.container } },
    },
    [media.desktop]: { minHeight: 56 },
  },
});

/** 아바타 60 → PC 40(`1546:19828` `Avatar` 40×40) */
export const memberAvatar = style({
  '@media': { [media.desktop]: { width: 40, height: 40 } },
});

export const memberMain = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  flex: 1,
  minWidth: 0,
  padding: `${vars.space[2]} 0`,
});

export const memberText = style({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0,
});

/** ⋮ — 44 터치 영역 */
export const menuButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 44,
  height: 44,
  padding: 0,
  border: 'none',
  borderRadius: vars.radius[2],
  background: 'transparent',
  color: vars.color.text.primaryLabel,
  cursor: 'pointer',
  selectors: {
    '&:hover:not(:disabled)': { background: vars.color.surface.container },
    '&:disabled': { cursor: 'not-allowed', color: vars.color.text.disabledLabel },
  },
});

/** 초대 대기 묶음(`1452:57010` "초대 대기") — 위 16 · 제목 ↔ 행 8 */
export const pending = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  paddingTop: vars.space[4],
});

export const pendingList = style([
  sprinkles({ listStyle: 'none' }),
  { display: 'flex', flexDirection: 'column', margin: 0, padding: 0 },
]);

/** 초대 대기 행(GUI 로컬 `초대 대기 행` `1468:5362`) — 60h · 위아래 12 · 글자 ↔ [취소] 12, 행 사이 1px `surface/default-border` */
export const pendingRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  padding: `${vars.space[3]} 0`,
  selectors: {
    '& + &': { borderTop: `1px solid ${vars.color.surface.defaultBorder}` },
  },
});

export const note = style({ margin: 0 });

/** [+] FAB — 모바일 오른쪽 16 · 아래 `fabBottom`. PC는 머리 줄 버튼(`inviteButton`)이라 숨긴다 */
export const fab = style({
  position: 'fixed',
  right: vars.space[4],
  bottom: fabBottom,
  zIndex: 10,
  '@media': { [media.desktop]: { display: 'none' } },
});

// ─── 오버레이 ─────────────────────────────────────────────

/** 권한 변경 팝업(`1422:1121`) — [지금 권한(비활성)] → [바꿀 권한 ▾], 간격 8 */
export const roleChange = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
});

export const roleChangeField = style({ flex: 1, minWidth: 0 });

/** 초대 시트(`1427:4143`) — [칸 줄 + 사유] ↔ 회색 상자 24(시트 묶음 간격) */
export const inviteForm = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[5],
});

/** 칸 줄 ↔ 줄 아래 사유 8(`1427:4143` `Frame 1707480467` · `1476:6806` `Frame 1707480463`) */
export const inviteField = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
});

/** 줄바꿈이 있는 문구(설명 두 줄 · `HOST_400_18` 두 줄) */
export const preLine = style({ whiteSpace: 'pre-line' });

/** 이메일(넓게) + 역할 116, 간격 8 */
export const inviteRow = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: vars.space[2],
});

export const inviteEmail = style({ flex: 1, minWidth: 0 });
export const inviteRole = style({ flex: '0 0 116px' });

/**
 * 분홍 안내(`1476:7673` "이전 링크 무효 안내" — 모든 초대 승인 방식(#348) 뒤로는 칸 아래 바로) — 꽉 찬 폭 · 안쪽 16 · 모서리 12 · `status/warning-subtle`(Coral-red 50).
 * FIGMA-CUSTOM: 화면이 직접 그린 상자(채움 변수) → 커스텀 HostMembers.css.ts. DS 후보(design-system §3 — 회색 안내 상자와 같은 모양)
 */
export const dangerBox = style({
  alignSelf: 'stretch',
  margin: 0,
  padding: vars.space[4],
  borderRadius: vars.radius[4],
  background: vars.color.status.warningSubtle,
});

// ─── 권한 안내 표(`1452:54461`) ─────────────────────────────

export const guideTable = style({
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
});

/** 머리 줄 — 아래 1px `text/primary-label`, 위아래 10 */
export const guideHead = style({
  // FIGMA-CUSTOM: 줄 위아래 10(`1452:54461` 표 행 p10/0) — 토큰 스케일(8 · 12)에 없는 Figma 값 그대로
  padding: '10px 0',
  borderBottom: `1px solid ${vars.color.text.primaryLabel}`,
  textAlign: 'left',
  fontWeight: 'inherit',
});

/** 몸 줄 — 아래 1px `surface/default-border`, 위아래 10 */
export const guideCell = style({
  // FIGMA-CUSTOM: 줄 위아래 10(`1452:54461` 표 행 p10/0) — 토큰 스케일에 없는 Figma 값 그대로
  padding: '10px 0',
  borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
  verticalAlign: 'middle',
});

/** 열 — 모바일 39 · 17.5 · 17.5 · 26%, PC 모달 224 · 60 · 60 · 88 / 432(`1496:10240` "권한 표") */
export const guideLabelCol = style({
  width: '39%',
  paddingRight: vars.space[2],
  textAlign: 'left',
  '@media': { [media.desktop]: { width: `${(224 / 432) * 100}%` } },
});
export const guideRoleCol = style({
  width: '17.5%',
  textAlign: 'center',
  '@media': { [media.desktop]: { width: `${(60 / 432) * 100}%` } },
});
export const guideGuestCol = style({
  width: '26%',
  textAlign: 'center',
  '@media': { [media.desktop]: { width: `${(88 / 432) * 100}%` } },
});

export const guideLabel = style({ whiteSpace: 'pre-line' });

export const check = style({ display: 'inline-flex', color: vars.color.brand.primary });

/** ✓ 칸 — 24 아이콘을 20으로(시트 `ic_circle-check` 20×20) */
globalStyle(`${check} > svg`, { width: 20, height: 20 });
