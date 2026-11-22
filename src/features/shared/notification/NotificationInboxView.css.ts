import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { sprinkles } from '@/ui/theme/sprinkles.css';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 알림함 — GUI 관객 창 `1047:4070` · 호스트 창 `2025:1471`(2026-11-22 Ready, 모바일 390).
 * 창 줄(`Frame 1707480466` — 위아래 12 · 좌우 24) / 행(`Frame 1707480419` — 위아래 16 · 좌우 24 · 간격 8) 사이 구분선 묶음
 * (`Frame 1707480422` — 위아래 4 + 선 `surface/default-border`)은 행의 아래 테두리 + 위아래 여백 4로 옮긴다.
 * PC 프레임은 없다 — 주문상세 · 마이페이지와 같은 가운데 640 한 열 + 위 제목(🤖 Claude 판단).
 */
export const page = style({
  flex: '1 0 auto',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  paddingBottom: vars.space[7],
  '@media': {
    [media.desktop]: { maxWidth: 640, margin: '0 auto', paddingTop: vars.space[7] },
  },
});

/** 화면 제목(h1). 모바일은 하위 헤더(Top app bar)가 제목을 보이므로 숨기고, PC는 가운데 제목 */
export const title = style({
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
      textAlign: 'center',
      paddingBottom: vars.space[5],
    },
  },
});

/** [관객 | 호스트] … 최신순 ▾ */
export const toolbar = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.space[3],
  padding: `${vars.space[3]} ${vars.space[5]}`,
});

/** 빨간 점 자리(탭 글자 오른쪽 위) */
export const tab = style({ position: 'relative' });

/** DS Badge small 8 — GUI는 탭 글자 오른쪽 끝에 위가 겹치게(`2009:35590`) */
export const tabDot = style({
  position: 'absolute',
  top: vars.space[2],
  right: `calc(-1 * ${vars.space[2]})`,
});

/** DS SortButton — 라벨 + chevron-down 12, 간격 4 */
export const sort = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[1],
  flexShrink: 0,
});

export const list = style([sprinkles({ listStyle: 'none' }), { margin: 0, padding: 0 }]);

export const item = style({
  borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
});

/**
 * 행 전체가 눌린다(링크 또는 버튼). 위아래 16 + 구분선 묶음 4.
 * 읽은 행: GUI는 행 전체 opacity 0.3 — 글자 · 아이콘을 `interaction/inactive`(#B8B7B3, 검정 30%와 거의 같은 색)로 바꿔 같은 모양을 낸다.
 * opacity는 시간 글자가 거의 안 보이고(#EAE9E8) 대비 검사가 색마다 갈려서(🤖 Claude 판단)
 */
export const row = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  width: '100%',
  padding: `calc(${vars.space[4]} + ${vars.space[1]}) ${vars.space[5]}`,
  border: 0,
  background: 'none',
  textAlign: 'left',
  color: vars.color.text.primaryLabel,
  textDecoration: 'none',
  cursor: 'pointer',
  selectors: {
    '[data-new="false"] > &': { color: vars.color.interaction.inactive },
    '&:hover': { background: vars.color.surface.container },
  },
});

/** 아이콘 · 이름 … 시간(GUI `Frame 1707480420` — 간격 11, 높이 24) */
export const head = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.space[3],
  minHeight: 24,
});

/** 아이콘 24 + 간격 8 + 이름 */
export const name = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
  minWidth: 0,
});

export const icon = style({ display: 'flex', flexShrink: 0 });

export const label = style({ overflowWrap: 'anywhere' });

export const time = style({ flexShrink: 0, whiteSpace: 'nowrap' });

export const text = style({ overflowWrap: 'anywhere' });

export const empty = style({ paddingTop: vars.space[9] });
