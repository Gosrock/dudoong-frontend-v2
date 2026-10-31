import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 공지 목록 — 디자인 없음(design-requests Q44). DS 토큰만 쓰고 모양을 짓지 않는다(design-workflow §3).
 * 배치는 같은 "글 목록" 화면인 알림함(P9b-V, 와이어 `128:2827`)을 따랐다: 제목 / 행 사이 선 / 행 전체가 눌린다.
 */
export const page = style({
  paddingTop: vars.space[3],
  paddingBottom: vars.space[8],
  '@media': { [media.desktop]: { paddingTop: vars.space[6] } },
});

export const title = style({
  marginBottom: vars.space[3],
  '@media': { [media.desktop]: { marginBottom: vars.space[5] } },
});

const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;

/** 관객 모바일 — 셸 하위 헤더가 제목을 보여 준다. 글자만 숨긴다(h1은 문서 구조에 남긴다) */
export const titleDesktopOnly = style([
  title,
  {
    ...visuallyHidden,
    '@media': {
      [media.desktop]: {
        position: 'static',
        width: 'auto',
        height: 'auto',
        overflow: 'visible',
        clip: 'auto',
        whiteSpace: 'normal',
      },
    },
  },
]);

export const list = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  borderTop: `1px solid ${vars.color.surface.defaultBorder}`,
});

export const item = style({
  borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
});

export const row = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  padding: `${vars.space[4]} 0`,
  color: 'inherit',
  textDecoration: 'none',
  '@media': { [media.desktop]: { padding: `${vars.space[5]} ${vars.space[4]}` } },
  selectors: {
    '&:hover': { background: vars.color.surface.container },
  },
});

export const content = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  flex: 1,
  minWidth: 0,
});

export const chips = style({ display: 'flex', gap: vars.space[1] });

/** 한 줄 말줄임(`Txt lines={1}`)이 줄어들 수 있게 */
export const rowTitle = style({ minWidth: 0 });

export const chevron = style({
  display: 'flex',
  flexShrink: 0,
  color: vars.color.text.tertiaryLabel,
});

export const empty = style({ paddingTop: vars.space[9] });
