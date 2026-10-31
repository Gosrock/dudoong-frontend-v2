import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 간편 공연 만들기(와이어 `108:2136`·`108:2168`·`108:2200`) — 와이어는 모바일 한 장씩이다. PC는 공연 밖 화면(셸 `Container`) 안에서
 * 폼이 600에서 멈춘다(호스트 만들기 P10a-V와 같은 값). 모양은 DS 토큰만(design-workflow §3).
 */
export const page = style({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  maxWidth: 600,
  margin: '0 auto',
  flex: '1 0 auto',
});

export const body = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[7],
  flex: '1 0 auto',
  paddingTop: vars.space[4],
});

/** 2단 진행 막대 — 와이어 회색 바탕 + 검정 채움(높이 8, 둥근 끝). 1단계 절반 · 2단계 전부 */
export const progress = style({
  height: vars.space[2],
  borderRadius: vars.radius.full,
  background: vars.color.interaction.inactiveBg,
  overflow: 'hidden',
});

export const progressFill = style({
  display: 'block',
  height: '100%',
  width: '50%',
  borderRadius: vars.radius.full,
  background: vars.color.background.dark,
  transition: 'width 200ms ease',
  selectors: { '&[data-step="2"]': { width: '100%' } },
});

export const step = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[5],
  flex: '1 0 auto',
});

export const plain = style({ margin: 0 });
export const preLine = style({ whiteSpace: 'pre-line' });

export const hostList = style({ display: 'flex', flexDirection: 'column', gap: vars.space[3] });

/** 호스트 줄(와이어 회색 상자 r12) — 고르면 검정 테두리, 고를 수 없으면 흐리게 */
export const hostRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[4],
  width: '100%',
  minHeight: 80,
  padding: `${vars.space[4]} ${vars.space[5]}`,
  border: `1.5px solid transparent`,
  borderRadius: vars.radius[4],
  background: vars.color.surface.container,
  color: vars.color.text.primaryLabel,
  textAlign: 'left',
  cursor: 'pointer',
  selectors: {
    '&[aria-checked="true"]': { borderColor: vars.color.text.primaryLabel },
    '&[aria-disabled="true"]': { cursor: 'not-allowed', color: vars.color.text.tertiaryLabel },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[6],
  flex: '1 0 auto',
});

export const times = style({ display: 'flex', alignItems: 'center', gap: vars.space[2] });
export const time = style({ flex: '1 1 0', minWidth: 0 });
export const radios = style({ display: 'flex', gap: vars.space[8] });

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
});

/** 아래 버튼 — 모바일은 화면 아래 고정(와이어 위치), PC는 폼 끝 */
export const footer = style({
  position: 'sticky',
  bottom: 0,
  marginTop: 'auto',
  padding: `${vars.space[4]} 0`,
  paddingBottom: `calc(${vars.space[4]} + env(safe-area-inset-bottom))`,
  background: vars.color.background.normal,
  '@media': { [media.desktop]: { position: 'static' } },
});
