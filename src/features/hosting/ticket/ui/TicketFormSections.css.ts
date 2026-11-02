import { globalStyle, style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 티켓 폼 칸 묶음(`TicketFormFields` · `TicketFormToggles` · `RefundObligationField`) — 화면 틀은 `TicketFormView.css.ts`.
 * DS 컴포넌트(`Input` · `RadioGroup`)에 붙이는 클래스는 `'&&'`로 세기를 올린다 — 화면을 나누면 이 CSS와 DS CSS가 다른 청크가 되고
 * 페이지의 `<link>` 순서가 import 순서를 따르지 않아, 같은 세기면 DS 기본값이 이긴다(320 리플로가 그래서 깨졌었다).
 */

/** 라디오 줄(간격 34 → 32) */
export const radios = style({
  selectors: { '&&': { display: 'flex', alignItems: 'center', gap: vars.space[6] } },
});

/** 판매 수량: [무제한] [수량 지정 | 0 장] — 모바일 한 줄 */
export const supplyRow = style({
  selectors: {
    '&&': {
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: vars.space[6],
      '@media': { [media.desktopS]: { gap: vars.space[4] } },
    },
  },
});

globalStyle(`${supplyRow} label`, { whiteSpace: 'nowrap' });

export const supplyCount = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  '@media': { [media.desktopS]: { gap: vars.space[2] } },
});

/** 금액·수량 칸 195(GUI `767:46709`) · 수량 지정 칸 136(`767:46723` 근사) */
export const narrow = style({ selectors: { '&&': { width: 195, maxWidth: '100%' } } });
export const count = style({
  selectors: {
    '&&': {
      width: 136,
      '@media': { [media.desktopS]: { width: 88 } },
    },
  },
});

/** 1280~ 가격 | 판매 수량 두 칸 한 줄(`821:25116`) */
export const priceSupply = style({
  display: 'flex',
  flexDirection: 'column',
  '@media': {
    [media.desktopS]: {
      display: 'grid',
      gridTemplateColumns: 'auto minmax(0, 1fr)',
      columnGap: vars.space[6],
    },
  },
});

/** 계좌: [은행 | 예금주] + 계좌번호(간격 10 → 8 — 묶음은 `Flex gap={2}`) */
export const accountRow = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: vars.space[2],
});

/** 판매 기간 상자 — 모바일 회색(`767:46768` 모서리 16 · 패딩 12 16 24 · 간격 16), PC는 판 안이라 배경 없음 */
export const period = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  padding: `${vars.space[3]} ${vars.space[4]} ${vars.space[5]}`,
  borderRadius: vars.radius[5],
  background: vars.color.surface.container,
  '@media': { [media.desktopS]: { padding: 0, background: 'transparent' } },
});

export const periodHead = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
  minHeight: 38,
});

export const dateTime = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: vars.space[2],
});

/** 환불 의무 동의(Q42 ④ — 디자인 없음). PC 두 열이면 왼쪽 열 맨 아래(저장 버튼 바로 위) */
export const agreement = style({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  '@media': { [media.desktopS]: { gridColumn: '1' } },
});
