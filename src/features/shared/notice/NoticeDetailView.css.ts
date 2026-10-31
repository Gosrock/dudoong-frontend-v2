import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 공지 상세 — 디자인 없음(design-requests Q44). DS 토큰만(design-workflow §3). 글 읽기 화면이라 PC에서도 본문 폭을
 * 공연 상세 본문 정도(최대 800)로 묶는다 — 근거 없음, Claude 판단(implementation-log P9c-V 결정).
 */
export const page = style({
  paddingTop: vars.space[4],
  paddingBottom: vars.space[8],
  '@media': { [media.desktop]: { paddingTop: vars.space[6] } },
});

export const article = style({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  maxWidth: 800,
  marginInline: 'auto',
});

export const head = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  paddingBottom: vars.space[4],
});

/** 상세는 제목 전체를 보여 준다(긴 제목은 줄바꿈) */
export const title = style({ overflowWrap: 'anywhere', wordBreak: 'keep-all' });

export const body = style({ padding: `${vars.space[5]} 0` });

export const footer = style({
  display: 'flex',
  justifyContent: 'center',
  paddingTop: vars.space[5],
});

export const retry = style({ paddingTop: vars.space[9] });
