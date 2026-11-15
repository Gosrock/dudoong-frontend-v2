import { globalStyle, style } from '@vanilla-extract/css';

import { fabBottom, fabClearance } from '@/ui/components/Fab/Fab.css';
import { media } from '@/ui/theme/breakpoints';
import { sprinkles } from '@/ui/theme/sprinkles.css';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 멤버 화면(`/hosting/hosts/[hostId]/members`) — **GUI 근거**(모바일 Ready, Design Sync #263~#266 · #268 · #269).
 * PC(1024~)는 Ready가 없어 와이어 배치(폭 600에서 멈춤 · 오른쪽 아래 버튼)를 그대로 두고 모바일 모양만 잇는다(🤖).
 */

/** 본문(`1421:755` "본문") — 세로 간격 8 · 하단 FAB에 마지막 줄이 가리지 않게 */
export const body = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  width: '100%',
  maxWidth: 600,
  paddingTop: vars.space[2],
  paddingBottom: fabClearance.lg,
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
 * 행 ↔ ⋮ 4, ⋮ 칸 44
 */
export const memberRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[1],
  minHeight: 76,
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

/** [+] FAB — 모바일 오른쪽 16 · 아래 `fabBottom`, PC 24 · 24(와이어 자리) */
export const fab = style({
  position: 'fixed',
  right: vars.space[4],
  bottom: fabBottom,
  zIndex: 10,
  '@media': { [media.desktop]: { right: vars.space[5], bottom: vars.space[5] } },
});

// ─── 오버레이 ─────────────────────────────────────────────

/** 권한 변경 팝업(`1422:1121`) — [지금 권한(비활성)] → [바꿀 권한 ▾], 간격 8 */
export const roleChange = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
});

export const roleChangeField = style({ flex: 1, minWidth: 0 });

/** 초대 시트(`1427:4143`) — 묶음 사이 24(시트 본문) */
export const inviteForm = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[5],
});

/** 이메일(넓게) + 역할 116, 간격 8 */
export const inviteRow = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: vars.space[2],
});

export const inviteEmail = style({ flex: 1, minWidth: 0 });
export const inviteRole = style({ flex: '0 0 116px' });

/** 칸 줄 아래 문구 · 회색 안내 상자, 간격 8 */
export const inviteMessages = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  marginTop: vars.space[2],
});

/**
 * 회색 안내 상자(`초대 링크 안내` · `초대 링크` · 권한 표 없음) — 모서리 12 · 안쪽 16 · `surface/container`.
 * FIGMA-CUSTOM: 화면이 직접 그린 상자(채움 변수) → 커스텀 HostMembers.css.ts. 같은 상자가 초대 수락(`1427:4625`)에도 있다 — DS 후보(design-system §3)
 */
export const greyBox = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: vars.space[2],
  padding: vars.space[4],
  borderRadius: vars.radius[4],
  background: vars.color.surface.container,
});

export const linkBox = style([greyBox, { gap: vars.space[1], alignItems: 'stretch' }]);

/** 링크 주소 한 줄 말줄임 */
export const linkUrl = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  margin: 0,
});

// ─── 권한 안내 표(`1452:54461`) ─────────────────────────────

export const guideTable = style({
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
});

/** 머리 줄 — 아래 1px `text/primary-label`, 위아래 10 */
export const guideHead = style({
  padding: '10px 0',
  borderBottom: `1px solid ${vars.color.text.primaryLabel}`,
  textAlign: 'left',
  fontWeight: 'inherit',
});

/** 몸 줄 — 아래 1px `surface/default-border`, 위아래 10 */
export const guideCell = style({
  padding: '10px 0',
  borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
  verticalAlign: 'middle',
});

export const guideLabelCol = style({ width: '39%', paddingRight: vars.space[2] });
export const guideRoleCol = style({ width: '17.5%', textAlign: 'center' });
export const guideGuestCol = style({ width: '26%', textAlign: 'center' });

export const guideLabel = style({ whiteSpace: 'pre-line' });

export const check = style({ display: 'inline-flex', color: vars.color.brand.primary });

/** ✓ 칸 — 24 아이콘을 20으로(시트 `ic_circle-check` 20×20) */
globalStyle(`${check} > svg`, { width: 20, height: 20 });
