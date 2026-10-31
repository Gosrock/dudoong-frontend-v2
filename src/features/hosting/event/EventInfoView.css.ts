import { globalStyle, style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 기본 정보 — 모바일(GUI `748:33451`): 좌우 24, 칸 묶음 사이 8 · 묶음 안 위아래 16.
 * PC(`748:34006`): 본문 위 28(→ 24) · 좌우 24, 제목 `Heading/lg-emphasized` + 아래 24, 1280~ 두 열 342 | 50(→ 48) | 오른쪽(칸 최대 600).
 */
export const page = style({ display: 'flex', flexDirection: 'column', flex: '1 0 auto' });

export const body = style({
  flex: '1 0 auto',
  padding: `${vars.space[3]} ${vars.space[5]} ${vars.space[6]}`,
  '@media': { [media.desktop]: { padding: `${vars.space[5]} ${vars.space[5]} ${vars.space[7]}` } },
});

/** PC만 — 모바일은 헤더 제목("기본 정보 ▾")이 대신한다 */
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
      display: 'block',
      margin: 0,
      paddingBottom: vars.space[5],
    },
  },
});

export const columns = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  '@media': {
    [media.desktop]: { maxWidth: 600 },
    [media.desktopS]: {
      maxWidth: 'none',
      display: 'grid',
      gridTemplateColumns: '342px minmax(0, 1fr)',
      columnGap: vars.space[8],
      alignItems: 'start',
    },
  },
});

export const fields = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  minWidth: 0,
  '@media': { [media.desktopS]: { maxWidth: 600 } },
});

export const posterColumn = style({ minWidth: 0 });

/** 포스터 + 버튼 — 모바일 180 왼쪽 정렬, PC 두 열이면 270 가운데(GUI 270×381, 버튼 가운데) */
export const posterBody = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: vars.space[4],
  '@media': { [media.desktopS]: { alignItems: 'center', paddingTop: vars.space[3] } },
});

export const poster = style({
  display: 'block',
  width: 180,
  aspectRatio: '180 / 255',
  height: 'auto',
  borderRadius: vars.radius[2],
  objectFit: 'cover',
  background: vars.color.surface.imageBg,
  '@media': { [media.desktopS]: { width: 270 } },
});

/** 모바일은 포스터 폭(180), PC는 글자 폭 */
export const posterButton = style({
  width: 180,
  '@media': { [media.desktopS]: { width: 'auto' } },
});

/** 일정 — 모바일: 날짜 한 줄 + 시작 ~ 종료 한 줄 / PC: 날짜 · 시작 ~ 종료가 한 줄(GUI `748:34487` 600×44) */
export const schedule = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  '@media': { [media.desktop]: { flexDirection: 'row', alignItems: 'center' } },
});

export const date = style({ flex: '1 1 auto', minWidth: 0 });

export const times = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
  '@media': { [media.desktop]: { flex: '0 0 auto' } },
});

export const time = style({
  flex: '1 1 0',
  minWidth: 0,
  '@media': { [media.desktop]: { width: 180, flex: '0 0 auto' } },
});

/** 공연장 이름 · 상세주소 — 모바일 위아래, PC 한 줄 두 칸(GUI `748:34829`) */
export const placeRow = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  '@media': { [media.desktop]: { flexDirection: 'row' } },
});
globalStyle(`${placeRow} > *`, { flex: '1 1 0', minWidth: 0 });

export const iconButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: vars.color.text.secondaryLabel,
  cursor: 'pointer',
  borderRadius: vars.radius[1],
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});
globalStyle(`${iconButton} > svg`, { width: 20, height: 20 });

export const radios = style({ display: 'flex', gap: vars.space[6] });

/** 문의처 줄 — 유형 116 + 값 + ✕ 24(GUI `748:33512`, 간격 8) */
export const contactRow = style({ display: 'flex', alignItems: 'flex-start', gap: vars.space[2] });
export const contactType = style({ flex: '0 0 116px' });
export const contactValue = style({ flex: '1 1 auto', minWidth: 0 });
export const removeButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 24,
  height: 44,
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: vars.color.text.primaryLabel,
  cursor: 'pointer',
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

/** 태그 — 모바일 4열(GUI 78 고정 → 칸 나눔), PC 7열(GUI `748:34645` 600 안 7칸) */
export const tags = style({
  '@media': { [media.desktop]: { gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' } },
});

export const preview = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.space[4],
  paddingBottom: vars.space[4],
  textAlign: 'center',
});

export const previewPoster = style({
  width: 180,
  aspectRatio: '180 / 254',
  height: 'auto',
  borderRadius: vars.radius[3],
  objectFit: 'cover',
  background: vars.color.surface.imageBg,
});

export const previewFacts = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  margin: 0,
  alignSelf: 'stretch',
  textAlign: 'left',
});

export const previewFact = style({ display: 'flex', gap: vars.space[3] });
export const previewValue = style({ margin: 0, minWidth: 0, overflowWrap: 'anywhere' });

export const note = style({ margin: 0 });
