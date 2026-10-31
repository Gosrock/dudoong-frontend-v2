import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 알림함 — 와이어 근거(모바일 `128:2827` · PC `668:4772`, design-workflow §3 — DS 토큰만, 모양을 짓지 않는다).
 * 모바일: ← 알림함 헤더(셸) 아래 [모두 읽음] 줄 + 행 목록. PC: 가운데 제목 "알림함" + 오른쪽 [모두 읽음], 행은 본문 폭 전체.
 * 행: 왼쪽 카테고리 아이콘(안 읽음은 왼쪽 위 빨간 점) | 카테고리 이름 … 상대 시간 / 제목 / 본문. 행 사이 선.
 */
export const page = style({
  paddingTop: vars.space[3],
  paddingBottom: vars.space[8],
  '@media': { [media.desktop]: { paddingTop: vars.space[6] } },
});

/** PC 제목 줄 — 모바일에서는 셸 헤더가 제목을 보여 주므로 글자만 숨긴다(h1은 문서 구조에 남긴다) */
export const titleRow = style({
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  alignItems: 'center',
  minHeight: 32,
  '@media': { [media.desktop]: { marginBottom: vars.space[5] } },
});

export const title = style({
  gridColumn: 2,
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  '@media': {
    [media.desktop]: { position: 'static', width: 'auto', height: 'auto', clip: 'auto' },
  },
});

export const titleAction = style({ gridColumn: 3, justifySelf: 'end' });

export const list = style({ listStyle: 'none', margin: 0, padding: 0 });

export const item = style({
  borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
});

/** 행 전체가 눌린다(링크 또는 버튼) */
export const row = style({
  display: 'grid',
  gridTemplateColumns: '24px 1fr',
  columnGap: vars.space[3],
  width: '100%',
  padding: `${vars.space[4]} 0`,
  border: 0,
  background: 'none',
  textAlign: 'left',
  color: 'inherit',
  textDecoration: 'none',
  cursor: 'pointer',
  '@media': { [media.desktop]: { padding: `${vars.space[5]} ${vars.space[4]}` } },
  selectors: {
    '&:hover': { background: vars.color.surface.container },
  },
});

/** 읽은 행은 아이콘·글자를 흐리게(와이어 — 읽은 행 전체가 회색) */
export const iconCell = style({
  position: 'relative',
  display: 'flex',
  color: vars.color.text.secondaryLabel,
  selectors: { '[data-read="true"] &': { color: vars.color.text.tertiaryLabel } },
});

/** 안 읽음 빨간 점 6px(gui-screens §1 `331:11574` 관측값, 와이어도 아이콘 왼쪽 위) */
export const unreadDot = style({
  position: 'absolute',
  top: -2,
  left: -4,
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: vars.color.status.error,
});

export const content = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  minWidth: 0,
});

export const meta = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: vars.space[2],
  minHeight: 24,
});

export const text = style({ overflowWrap: 'anywhere' });

export const empty = style({ paddingTop: vars.space[9] });

/** 화면 읽기 도구에만 "안 읽음"(빨간 점은 aria-hidden) */
export const srOnly = style({
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
});
