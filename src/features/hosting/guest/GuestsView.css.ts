import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 예매자 관리 — GUI 모바일 `980:24474` "본문"(좌우 24 · 위 12, 간격 16), 데스크탑 `980:24295`(좌우 24 · 위아래 28, 제목 아래 24 + 간격 20).
 * 아래 여백은 선택 바(모바일 하단 고정 93)가 표를 덮지 않게 넉넉히
 */
export const page = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  padding: `${vars.space[3]} ${vars.space[5]} ${vars.space[9]}`,
  '@media': {
    [media.desktop]: {
      gap: vars.space[5],
      padding: `calc(${vars.space[5]} + ${vars.space[1]}) ${vars.space[5]} ${vars.space[9]}`,
    },
  },
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
      // 글자 줄 상자만(h1 기본 글꼴의 줄 높이가 31을 62로 키워 탭이 11px 내려갔다 — Figma 전수조사 2026-11-07, `980:24296` 55)
      display: 'flex',
      // GUI 제목 묶음 아래 24(`980:24296` paddingBottom)
      paddingBottom: vars.space[5],
    },
  },
});

/** 탭 아래 16(모바일) · 20(PC) */
export const panel = style({
  paddingTop: vars.space[4],
  '@media': { [media.desktop]: { paddingTop: `calc(${vars.space[4]} + ${vars.space[1]})` } },
});

export const panelNotice = style({ paddingTop: vars.space[3] });

/** 탭 안 — 도구 줄 → 표 → 페이지 · 엑셀(간격 16 · PC 20) */
export const tab = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  '@media': { [media.desktop]: { gap: `calc(${vars.space[4]} + ${vars.space[1]})` } },
});

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
