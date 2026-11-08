import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/** 우편번호 창 — 시트·모달 안에서 높이 고정(우편번호 서비스가 iframe으로 채운다) */
export const postcode = style({ position: 'relative', width: '100%', height: 460 });
export const postcodeFrame = style({ width: '100%', height: '100%' });

/** 가운데 안내 글자(로딩·실패·좌표 없음) */
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
