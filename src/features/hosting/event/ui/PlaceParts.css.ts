import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 우편번호 칸(우편번호 서비스가 iframe으로 채운다) — 모서리 12 · 테두리 `surface/default-border` · 바탕 `surface/container`(GUI `1592:16565` 342×650 모바일 ·
 * `1592:16739` 432×494 PC, #314 · #315). 모바일은 시트가 화면을 넘지 않게 화면 높이에서 시트 머리 · 여백을 뺀 만큼까지.
 * 아래 여백 34 = 판 안쪽 24 + 10(`1592:16734` · `1592:16559` paddingBottom 34)
 */
export const postcode = style({
  position: 'relative',
  width: '100%',
  height: 'min(650px, calc(100dvh - 194px))',
  marginBottom: 10,
  overflow: 'hidden',
  border: `1px solid ${vars.color.surface.defaultBorder}`,
  borderRadius: vars.radius[4],
  background: vars.color.surface.container,
  '@media': { [media.desktop]: { height: 494 } },
});
export const postcodeFrame = style({ width: '100%', height: '100%' });

/** 가운데 안내(우편번호 로딩·실패, 지도 서비스 실패) */
export const overlayText = style({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: vars.space[4],
});

/**
 * 지도 칸 — 높이 147(GUI 모바일 `748:33391`·`748:33492`·`1269:29539`, PC 실패 `1277:30239` — Design Sync #180),
 * 모서리 8, 빈 칸 배경 #EEEEED(GUI `A4 - 1` = `surface.imageBg`). PC 정상 `748:34508`은 아직 144 — 147로 통일(Q210 🤖)
 */
export const map = style({
  position: 'relative',
  width: '100%',
  height: 147,
  overflow: 'hidden',
  borderRadius: vars.radius[2],
  background: vars.color.surface.imageBg,
});

export const mapCanvas = style({ width: '100%', height: '100%' });
