import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 초대 수락 `/host-invitations/{token}` — **GUI 근거**(모바일 Design Sync #267: `1427:4596` 등 8장, PC 1440 #299: `1496:13112` ·
 * `1496:13198`). 모바일은 셸 본문 높이를 채워 묶음을 세로 가운데에, 버튼 줄은 아래(위아래 36 · 좌우 24).
 * PC는 묶음과 버튼 줄을 한 덩어리로 화면 가운데(`1496:13112` `Frame 1707480480` — 사이 32), 폭 345(393 − 24 × 2).
 */

/** PC 묶음 폭(`1496:13182` "초대 정보" 345) */
const DESKTOP_WIDTH = 345;

export const page = style({
  flex: '1 0 auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
  padding: `0 ${vars.space[5]}`,
  '@media': { [media.desktop]: { justifyContent: 'center' } },
});

/** 가운데 묶음 — 남은 높이에서 세로 가운데 */
export const center = style({
  flex: '1 0 auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  maxWidth: 342,
  padding: `${vars.space[6]} 0`,
  '@media': { [media.desktop]: { flex: '0 0 auto', maxWidth: DESKTOP_WIDTH, padding: 0 } },
});

/** 초대 내용(`1427:4596` "초대 내용") — 아바타 100 · 문구 · 정보 상자, 간격 16 */
export const invite = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.space[4],
  width: '100%',
  textAlign: 'center',
});

/**
 * 정보 상자(`1427:4625` "초대 정보") — 342 · 모서리 12 · 안쪽 16 · 줄 사이 8 · `surface/container`.
 * FIGMA-CUSTOM: 화면이 직접 그린 상자 + GUI 로컬 `정보 줄`(형태=가로) → 커스텀 HostInvitation.css.ts. 멤버 초대 시트의 회색 상자와 같은 모양 — DS 후보(design-system §3)
 */
export const infoBox = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  width: '100%',
  margin: 0,
  padding: vars.space[4],
  borderRadius: vars.radius[4],
  background: vars.color.surface.container,
  textAlign: 'left',
});

/** 정보 줄 — 라벨 칸 80(글자 가운데) · 간격 12 · 값 */
export const infoRow = style({
  display: 'grid',
  gridTemplateColumns: '80px 1fr',
  columnGap: vars.space[3],
  alignItems: 'center',
});

export const infoLabel = style({ margin: 0, textAlign: 'center' });
export const infoValue = style({ margin: 0, minWidth: 0, overflowWrap: 'anywhere' });

/** 버튼 줄(`1427:4596` 아래) — 위아래 36. PC는 묶음 바로 아래(사이 32 — `1496:13193` 위 36과 별개) */
export const actions = style({
  display: 'grid',
  gridAutoFlow: 'column',
  gridAutoColumns: '1fr',
  gap: vars.space[3],
  width: '100%',
  maxWidth: 342,
  // FIGMA-CUSTOM: 버튼 줄 위아래 36(GUI `1427:4596` `Frame 1707480366` p36/24) — 토큰 스케일(32 · 40)에 없는 Figma 값 그대로
  padding: `36px 0`,
  '@media': {
    [media.desktop]: { maxWidth: DESKTOP_WIDTH, marginTop: vars.space[6] },
  },
});

/** 결과 화면 [Primary Large] 링크 — 밑줄 없이 */
export const actionLink = style({ textDecoration: 'none' });
