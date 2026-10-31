import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/** 예매자 관리 — 와이어 근거(`424:11710`). 좌우 24, PC 위 24 + 제목(기본 정보 화면과 같은 머리) */
export const page = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  padding: `${vars.space[3]} ${vars.space[5]} ${vars.space[6]}`,
  '@media': { [media.desktop]: { padding: `${vars.space[5]} ${vars.space[5]} ${vars.space[7]}` } },
});

/** PC만 — 모바일은 헤더 제목("예매자 관리 ▾")이 대신한다(기본 정보 `desktopTitle`과 같다) */
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

export const panel = style({ paddingTop: vars.space[4] });

/** 탭 안 — 상태 칩 → 검색 → 표 → 엑셀(간격 16) */
export const tab = style({ display: 'flex', flexDirection: 'column', gap: vars.space[4] });

/** 표 머리의 숨김 글자 — 절대 위치를 쓰지 않는다(표 가로 스크롤 밖으로 빠져 화면 폭을 넓히지 않게) */
export const srOnly = style({
  display: 'inline-block',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
});

/** 표 칸은 줄바꿈하지 않는다 — 좁으면 표가 가로로 스크롤된다(와이어 `424:11710` 스크롤 막대) */
export const nowrap = style({ whiteSpace: 'nowrap' });
