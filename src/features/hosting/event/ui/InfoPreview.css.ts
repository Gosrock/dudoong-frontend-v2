import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/**
 * 기본 정보 미리보기(`InfoPreview`).
 * DS 컴포넌트(`Input` · `RadioGroup` · `DatePicker` …)에 붙이는 클래스는 `'&&'`로 세기를 올린다 — 화면을 나누면 이 CSS와 DS CSS가
 * 다른 청크가 되고 페이지의 `<link>` 순서가 import 순서를 따르지 않아, 같은 세기면 DS 기본값이 이긴다(티켓 폼 320 리플로가 그래서 깨졌었다).
 */

export const preview = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.space[4],
  paddingBottom: vars.space[4],
  textAlign: 'center',
});

export const previewPoster = style({
  selectors: {
    '&&': {
      width: 180,
      aspectRatio: '180 / 254',
      height: 'auto',
      borderRadius: vars.radius[3],
      objectFit: 'cover',
      background: vars.color.surface.imageBg,
    },
  },
});

export const previewFacts = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  margin: 0,
  alignSelf: 'stretch',
  textAlign: 'left',
});

export const previewValue = style({
  selectors: { '&&': { margin: 0, minWidth: 0, overflowWrap: 'anywhere' } },
});
