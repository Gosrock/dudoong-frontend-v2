import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { sprinkles } from '@/ui/theme/sprinkles.css';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 호스트 연락처 시트 본문(GUI `1383:40498` "헤더"): 사진 100 → 사이 8 → 글자 묶음(좌우 24 더 들임 · 이름–소개 4 · 글자–아이콘 16).
 * 시트 아래는 묶음 안쪽 12 + 시트 안쪽 16 = 28(손잡이 → 사진 24는 시트 변형 `rounded`가 준다)
 */
export const body = style({
  paddingBottom: vars.space[3],
  // PC 모달(GUI `1989:28800`)은 판 안쪽 24가 아래 여백이다
  '@media': { [media.desktop]: { paddingBottom: 0 } },
});

export const text = style({ paddingInline: vars.space[5] });

/** 아이콘 줄 — 사이 12, 가운데, 넘치면 다음 줄(`1948:17959`) */
export const icons = style([
  sprinkles({ listStyle: 'none' }),
  {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: vars.space[3],
    margin: 0,
    padding: 0,
  },
]);

/**
 * 연락처 원 36 — GUI 로컬 "호스트홈_연락처"(`1948:17960`, 호스트 홈 `1478:7210`과 같은 부품): 채움 `#f7f7f6` · 아이콘 24.
 * 호스트 홈(`HostHomeView.css` `contactButton`)과 같은 값
 */
export const iconButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  padding: 0,
  border: 0,
  borderRadius: vars.radius.full,
  background: vars.color.surface.container,
  color: vars.color.text.primaryLabel,
  textDecoration: 'none',
  cursor: 'pointer',
  selectors: {
    '&:hover:not(:disabled)': { background: vars.color.surface.container2 },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
    '&:disabled': { cursor: 'progress', opacity: 0.6 },
  },
});
