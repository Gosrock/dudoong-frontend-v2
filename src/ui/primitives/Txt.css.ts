import { style, styleVariants } from '@vanilla-extract/css';

export const base = style({ margin: 0 });

/** 줄 수 제한(디자이너 메모 — 카드 제목 2줄, 장소 1줄 등, design-system §3) */
export const lines = styleVariants({
  1: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  2: {
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
});
