import { globalStyle, style } from '@vanilla-extract/css';

/** QR 그림 자리 — 부모 폭을 채우는 정사각형. 그림(svg)이 자리를 채운다 */
export const root = style({
  display: 'flex',
  width: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  aspectRatio: '1 / 1',
  flexShrink: 0,
});

globalStyle(`${root} > svg`, { display: 'block', width: '100%', height: '100%' });
