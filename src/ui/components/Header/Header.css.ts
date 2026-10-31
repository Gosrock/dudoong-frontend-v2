import { globalStyle, style, styleVariants } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/**
 * Figma Top app bar(`37:44`) — 390×64, 패딩 16·24(아이콘이 있는 쪽은 8 — 2026-10-31), 슬롯 40×40, 간격 16. 모든 변형이 모바일 폭이다(데스크탑 헤더 없음).
 * 제목은 1줄 말줄임으로 통일했다(Figma는 변형마다 다름 — 디자이너 확인 대기, design-system §5).
 */
export const root = style({
  display: 'grid',
  alignItems: 'center',
  columnGap: vars.space[4],
  width: '100%',
  minHeight: 64,
  padding: `${vars.space[2]} ${vars.space[5]}`,
  boxSizing: 'border-box',
  background: vars.color.background.normal,
  color: vars.color.text.primaryLabel,
});

/** start: 제목이 왼쪽(Default), center: 양쪽 슬롯 폭과 상관없이 가운데(only title·Title+Backward·로고형) */
export const align = styleVariants({
  start: { gridTemplateColumns: 'auto minmax(0, 1fr) auto' },
  /** 왼쪽 슬롯이 비면 제목이 패딩 바로 뒤에서 시작한다(Figma `leading icon=false`) */
  startNoLeading: { gridTemplateColumns: 'minmax(0, 1fr) auto' },
  center: {
    gridTemplateColumns: 'minmax(max-content, 1fr) minmax(0, auto) minmax(max-content, 1fr)',
  },
});

export const slot = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[4],
  minWidth: 0,
  selectors: {
    '&:empty': { minWidth: 0 },
  },
});

export const slotEnd = style([slot, { justifyContent: 'flex-end' }]);

export const center = style({ display: 'flex', flexDirection: 'column', minWidth: 0 });

export const centerAlign = styleVariants({
  start: { alignItems: 'flex-start' },
  center: { alignItems: 'center' },
});

export const title = style([
  typography.headingMdEmphasized,
  {
    margin: 0,
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
]);

export const ellipsis = style({
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

/** 공연 전환형 — 제목 + ▾(12, 원형 배경 `surface/container`) 버튼 */
export const titleButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[1],
  minWidth: 0,
  maxWidth: '100%',
  padding: 0,
  border: 'none',
  background: 'none',
  color: 'inherit',
  font: 'inherit',
  letterSpacing: 'inherit',
  cursor: 'pointer',
  selectors: {
    // 제목(h1)이 overflow: hidden이라 바깥 외곽선은 잘린다 — 안쪽으로 그린다
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: -2 },
  },
});

export const switchMark = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 16,
  height: 16,
  borderRadius: vars.radius.full,
  background: vars.color.surface.container,
});

export const subtitle = style([
  typography.labelMd,
  {
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
]);

/** 24 아이콘 슬롯 버튼(뒤로가기·메뉴 등). 누르는 영역은 40으로 넓히고 바깥 여백으로 상쇄한다(아래 끝 자리 규칙 참고) */
export const iconButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 40,
  height: 40,
  margin: -8,
  padding: 0,
  border: 'none',
  borderRadius: vars.radius.full,
  background: 'none',
  color: 'inherit',
  cursor: 'pointer',
  textDecoration: 'none',
  selectors: {
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: -2 },
  },
});

/** 왼쪽·오른쪽 슬롯 표시(아래 끝 자리 규칙용 — 모양 없음) */
export const leadingSlot = style({});
export const trailingSlot = style({});

/*
 * Figma Top app bar 2026-10-31: 아이콘 자리 40×40, 아이콘 쪽 바깥 패딩 8(제목·프로필 쪽은 24 그대로).
 * 패딩은 24로 두고 바깥 끝 아이콘 버튼만 16 더 내보낸다 — 로고·아바타 같은 아이콘 아닌 슬롯은 24에 남는다.
 * 제목 시작 위치(8 + 40 + 16 = 64)는 옛 판과 같다.
 */
globalStyle(`${leadingSlot} > ${iconButton}:first-child`, { marginLeft: -16 });
globalStyle(`${leadingSlot} > ${iconButton}:last-child`, { marginRight: 0 });
globalStyle(`${trailingSlot} > ${iconButton}:last-child`, { marginRight: -16 });
globalStyle(`${trailingSlot} > ${iconButton}:first-child`, { marginLeft: 0 });
