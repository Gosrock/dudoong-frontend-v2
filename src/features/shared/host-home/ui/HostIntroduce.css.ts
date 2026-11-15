import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/** 소개글 + [더보기] — 사이 4(GUI `1452:41511`) */
export const root = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.space[1],
  width: '100%',
  // PC는 왼쪽 정렬(와이어 배치 🤖)
  '@media': { [media.desktop]: { alignItems: 'flex-start' } },
});

export const text = style({ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' });

/** 3줄 클램프(GUI "소개글_3줄" `1464:5016`) */
export const clampBox = style({
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 3,
  overflow: 'hidden',
});

/** [더보기 ⌄] · [접기 ⌃] — Label/md `text/tertiary` + 16 아이콘, 사이 2(GUI `1464:5029`) */
export const toggle = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 2,
  padding: 0,
  border: 0,
  background: 'none',
  color: vars.color.text.tertiary,
  cursor: 'pointer',
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

export const toggleIcon = style({ width: 16, height: 16, flexShrink: 0 });
