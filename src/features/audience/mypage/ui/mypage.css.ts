import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 마이페이지 · 주문내역 · 주문상세 · 관심 호스트 · 아카이빙 공용 배치(P9-V — 와이어 근거, DS 토큰만).
 * 모바일 와이어는 390 한 열(`128:2772` 등), PC 와이어(`668:5085`·`668:5805`·`667:4078`·`671:6692`)는 가운데 열 + 위 제목.
 * PC 폭은 와이어 주문내역(1440 프레임 안 좌우 약 115)에서 잰 값 대신 체크아웃과 같은 가운데 열로 둔다(🤖 — 와이어 수준).
 */
export const page = style({
  flex: '1 0 auto',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  paddingBottom: vars.space[7],
  '@media': {
    [media.desktop]: {
      maxWidth: 960,
      margin: '0 auto',
      paddingTop: vars.space[7],
    },
  },
});

/** 좁은 한 열(마이페이지 · 주문상세) — PC에서도 640 */
export const narrowPage = style([page, { '@media': { [media.desktop]: { maxWidth: 640 } } }]);

/** 화면 제목(h1). 모바일은 하위 헤더가 제목을 보이므로 숨기고(읽기 전용), PC는 가운데 제목(와이어 PC `668:5085`) */
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

export const list = style({ listStyle: 'none', margin: 0, padding: 0 });

/** 목록 행 사이 선(와이어 주문 카드 구분선) */
export const row = style({
  borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
});

/** 안내 상자(거절 사유 · 환불 계좌 유도 · 취소 안내) */
export const notice = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  margin: `${vars.space[4]} ${vars.space[5]}`,
  padding: `${vars.space[3]} ${vars.space[4]}`,
  borderRadius: vars.radius[2],
  background: vars.color.surface.container,
});

/** 시트 · 모달 안 안내 상자(좌우 여백은 시트가 준다) */
export const sheetNotice = style([notice, { margin: 0 }]);

export const warningNotice = style([notice, { background: vars.color.status.warningSubtle }]);

export const noticeList = style({
  margin: 0,
  paddingLeft: vars.space[4],
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
});

export const posterImage = style({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const grow = style({ flex: 1, minWidth: 0 });

export const stateBox = style({ padding: `${vars.space[7]} ${vars.space[5]}` });

export const plainLink = style({ color: 'inherit', textDecoration: 'none' });

export const preLine = style({ whiteSpace: 'pre-line' });
