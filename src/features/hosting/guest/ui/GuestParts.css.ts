import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * GUI "도구 줄"(`1026:4516` — PC 1124×44, 상태 필터 왼쪽 · 검색 440 오른쪽 · 양 끝 정렬).
 * 모바일(`980:24474`)은 상태 필터 → 검색 세로, 간격 16
 */
export const toolbarWrap = style({ display: 'flex', flexDirection: 'column', gap: vars.space[3] });

export const toolbar = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  '@media': {
    [media.desktop]: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: vars.space[4],
    },
  },
});

/** 완전 일치 안내 — GUI `1029:4569`(PC 오른쪽) · `987:500`(모바일 왼쪽) */
export const hint = style({
  margin: 0,
  '@media': { [media.desktop]: { textAlign: 'right' } },
});

/** 상태 칩 줄 — 간격 8, 모바일은 넘치면 가로 스크롤(GUI 5개가 342를 넘는다 — `980:24474`) */
export const filters = style({
  display: 'flex',
  gap: vars.space[2],
  overflowX: 'auto',
  scrollbarWidth: 'none',
  // 모바일은 화면 끝까지 스크롤(본문 좌우 24를 넘는다 — GUI 칩이 오른쪽 끝에서 잘린다)
  marginInline: `calc(${vars.space[5]} * -1)`,
  paddingInline: vars.space[5],
  '@media': {
    [media.desktop]: {
      flexWrap: 'wrap',
      overflowX: 'visible',
      marginInline: 0,
      paddingInline: 0,
    },
  },
});

/** [기준 116] [검색어 남은 폭] — PC 440 고정 */
export const search = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
  '@media': { [media.desktop]: { flex: '0 0 440px' } },
});

export const searchType = style({ flex: '0 0 116px' });

export const searchInput = style({ flex: '1 1 auto', minWidth: 0 });

export const notice = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
});

export const noticeClose = style({
  display: 'inline-flex',
  padding: vars.space[1],
  border: 0,
  background: 'none',
  color: vars.color.text.secondaryLabel,
  cursor: 'pointer',
  borderRadius: vars.radius[1],
});

/** 표 안 가운데 — 불러오기 실패(글 + [다시 시도], 간격 12) */
export const slot = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.space[3],
});

/** 행 끝 › (GUI `1026:4562` ic chevron-right 16) */
export const chevronCell = style({ display: 'inline-flex', color: vars.color.text.primaryLabel });

/** 행 안 버튼 묶음([거절][승인] — 간격 4) */
export const rowActions = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[1],
});
