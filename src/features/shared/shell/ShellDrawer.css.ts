import { globalStyle, style } from '@vanilla-extract/css';

import { sprinkles } from '@/ui/theme/sprinkles.css';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 햄버거 드로어 — GUI `1047:19428`(로그인) · `1174:15071`(미로그인), Ready 2026-11-07. 본문은 세로 한 줄(간격 16)이고
 * 줄마다 아이콘 24 + 간격 8 + 글자.
 */
const reset = {
  display: 'flex',
  alignItems: 'center',
  padding: 0,
  border: 0,
  background: 'transparent',
  color: vars.color.text.primaryLabel,
  textDecoration: 'none',
  font: 'inherit',
  cursor: 'pointer',
  borderRadius: vars.radius[2],
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
    '&:disabled': { color: vars.color.interaction.disabledText, cursor: 'not-allowed' },
  },
} as const;

/** 아이콘 24 + 간격 8 + 글자(`1047:31792` — 높이 24) */
export const row = style({ ...reset, gap: vars.space[2], minHeight: 24, alignSelf: 'flex-start' });

/**
 * 메뉴 글자 — GUI는 글자 스타일 없이 16 · 500 · 행간 120%(`1047:31794` 등). 가장 가까운 `labelLg`(16 · 400 · 120%)에 굵기만 500.
 * FIGMA-CUSTOM: 메뉴 글자(gui 1047:31794 "주문내역" 외) 스타일 없음 → labelLg + 굵기 500. Figma 코멘트 2026-11-07
 */
export const itemLabel = style({ fontWeight: 500 });

/** "공연 둘러보기 ↗" · "호스팅 센터 ↗"(`1047:32312` — 20 굵게 + 아이콘, 간격 8) */
export const shortcut = style({ ...reset, gap: vars.space[2], alignSelf: 'flex-start' });

/** 프로필 줄(`1047:31889` — 위아래 12, 아바타 60 ↔ 글자 22) */
export const profile = style({
  ...reset,
  gap: 22,
  width: '100%',
  padding: `${vars.space[3]} 0`,
});

/** 미로그인 "로그인 ›"(`1175:15438` — 간격 8) */
export const loginLabel = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[2],
});

export const profileAvatar = style({ position: 'relative', display: 'inline-flex', flexShrink: 0 });

/**
 * 아바타(60) 오른쪽 아래 연필 배지 20(`1047:31894` — 20 원 · 연필 14, 아바타 오른쪽 끝에서 4 밖). PC 아바타 메뉴(DS `My` — 45에 20)
 * · 마이페이지(80에 24 + 흰 테두리)와는 근거가 달라 묶지 않는다(코드 패턴 점검 A31)
 */
export const editBadge = style({
  position: 'absolute',
  right: -4,
  bottom: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  height: 20,
  borderRadius: vars.radius.full,
  background: vars.color.background.darkFixed,
  color: vars.color.text.inverse,
});

export const editIcon = style({ width: 14, height: 14 });

export const profileText = style({ display: 'flex', flexDirection: 'column', minWidth: 0 });

export const list = style([sprinkles({ listStyle: 'none' }), { margin: 0, padding: 0 }]);

/** 구분선 묶음(`1047:32317` — 높이 8, 위아래 4) */
export const dividerBox = style({ padding: `${vars.space[1]} 0` });

/** 호스트가 없을 때 회색 칸(`1175:15425` — 높이 60, 모서리 12, `#EEEEED`) */
export const empty = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 60,
  margin: 0,
  borderRadius: vars.radius[4],
  background: vars.color.background.grey,
});

/** 호스트 아바타 줄(`1047:31991` — 위아래 8, 간격 16). 가로로 넘치면 스크롤 */
export const hostRow = style([
  sprinkles({ listStyle: 'none' }),
  {
    display: 'flex',
    gap: vars.space[4],
    margin: 0,
    padding: `${vars.space[2]} 0`,
    overflowX: 'auto',
    scrollbarWidth: 'none',
  },
]);

/** 호스트 한 칸(`1047:31734` — 폭 60, 아바타 ↔ 이름 4) */
export const host = style({
  ...reset,
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: vars.space[1],
  width: 60,
});

export const hostName = style({ maxWidth: '100%', textAlign: 'center' });

export const moreCircle = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 60,
  height: 60,
  borderRadius: vars.radius.full,
  border: `1px solid ${vars.color.surface.defaultBorder}`,
});

/** 새 호스트 · 새 공연 만들기(`1047:32204` — 두 칸 사이 43. 토큰에 없는 GUI 값 그대로, 좁으면 줄바꿈) */
export const create = style({ columnGap: 43, rowGap: vars.space[4] });

globalStyle(`${row} > svg, ${shortcut} > svg`, { flexShrink: 0 });
