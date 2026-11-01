import { globalStyle, style } from '@vanilla-extract/css';

import { fabBottom, fabClearance } from '@/ui/components/Fab/Fab.css';
import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 호스트 설정 · 멤버(plan P10b V) — **와이어 근거**(`503:32374` 설정, `503:30866` 멤버 흐름). 와이어 수준이라 DS 토큰으로 배치만 잡는다
 * (design-workflow §3). 폭은 호스트 만들기(P10a)와 같이 600에서 멈춘다.
 */

/** 화면 — 하단 고정 바가 아래에 붙도록 남은 높이를 채운다 */
export const page = style({ display: 'flex', flexDirection: 'column', flex: '1 0 auto' });

export const body = style({ flex: '1 0 auto' });

export const note = style({ margin: 0 });

/** 이미지 두 자리 — 모바일 세로, PC 가로 */
export const images = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  '@media': { [media.desktop]: { flexDirection: 'row' } },
});

export const imageSlot = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  flex: 1,
  minWidth: 0,
});

/**
 * DropZone 칸 비율 — DropZone 기본은 포스터(180:254)라 덮어쓴다. 프로필은 정사각 180, 커버는 호스트 홈 배너와 같은 비율로 폭을 채운다
 * (🤖 디자인 대기 — 이미지 칸 자체가 와이어·GUI에 없다)
 */
/** 호스트 홈 모바일 배너(`HostHomeView.css` banner)와 같은 비율 */
const COVER_RATIO = '390 / 230';

export const profileZone = style({});
export const coverZone = style({ width: '100%' });
globalStyle(`${profileZone} > div:first-child`, { width: 180, aspectRatio: '1 / 1' });
globalStyle(`${coverZone} > div:first-child`, { width: '100%', aspectRatio: COVER_RATIO });

// ─── 멤버 ─────────────────────────────────────────────────

export const members = style({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  maxWidth: 600,
  // FAB에 마지막 줄이 가리지 않게 — 안전 영역까지(#92-8)
  paddingBottom: fabClearance.lg,
});

export const memberList = style({
  display: 'flex',
  flexDirection: 'column',
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

export const memberRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  minHeight: 64,
  padding: `${vars.space[2]} 0`,
  borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
});

export const memberText = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  flex: 1,
  minWidth: 0,
});

/** ⋮ — 44 터치 영역(티켓 카드 메뉴와 같은 모양) */
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
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}` },
    '&:disabled': { cursor: 'not-allowed', color: vars.color.text.disabledLabel },
  },
});

export const guideButton = style({ alignSelf: 'flex-start' });

/** [+ 멤버 초대하기] — 와이어의 오른쪽 아래 떠 있는 버튼. 모바일 16 · 24, PC 24 · 24(티켓 FAB와 같은 자리) */
export const inviteButton = style({
  position: 'fixed',
  right: vars.space[4],
  bottom: fabBottom,
  zIndex: 10,
  borderRadius: vars.radius.full,
  '@media': { [media.desktop]: { right: vars.space[5], bottom: vars.space[5] } },
});

/** 역할 변경 — "매니저 → 일반" */
export const roleChange = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
});

/** 초대 — 이메일(넓게) + 역할(좁게) */
export const inviteRow = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: vars.space[2],
});

export const inviteEmail = style({ flex: 1, minWidth: 0 });
export const inviteRole = style({ flex: '0 0 112px' });

export const inviteForm = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
});

export const check = style({ display: 'inline-flex', color: vars.color.brand.primary });

export const visuallyHidden = style({
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
});
