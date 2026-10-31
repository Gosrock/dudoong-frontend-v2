import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 호스트 만들기(와이어 `495:14815`) — 와이어는 모바일 한 장뿐이다. PC는 폼이 1280까지 늘어나지 않게 600에서 멈춘다
 * (🤖 판단 — 디자인 시스템 바텀시트 PC 최대 폭과 같은 값).
 */
/** 화면 본문 랜드마크(`main`). 셸 본문의 세로 흐름을 그대로 잇는다(P14 접근성) */
export const page = style({ display: 'flex', flexDirection: 'column', flex: '1 0 auto' });

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[6],
  width: '100%',
  maxWidth: 600,
  paddingBottom: vars.space[6],
  '@media': { [media.desktop]: { paddingTop: vars.space[5] } },
});

export const contactRow = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: vars.space[2],
});

/** 유형 드롭다운(와이어 `495:14815` 왼쪽 칸 — 오른쪽 입력보다 좁다) */
export const contactType = style({ flex: '0 0 128px' });

export const contactValue = style({ flex: 1, minWidth: 0 });

export const removeButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 44,
  height: 44,
  padding: 0,
  border: 'none',
  borderRadius: vars.radius.full,
  background: 'transparent',
  color: vars.color.text.secondaryLabel,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: vars.color.surface.container },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}` },
  },
});

export const contacts = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  margin: 0,
  padding: 0,
  border: 'none',
  minWidth: 0,
});

export const legend = style({ padding: 0 });

export const addButton = style({ alignSelf: 'flex-start' });
