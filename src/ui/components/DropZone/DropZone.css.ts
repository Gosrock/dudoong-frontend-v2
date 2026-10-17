import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';

/**
 * GUI 이미지 업로드 칸(`311:1633` 안 `311:1802`): 포스터 자리 180×254(모서리 10) 가운데에 Secondary "이미지 업로드" 버튼.
 * 포스터 자리의 일러스트(`img_포스터 준비중`)는 일러스트 에셋이 들어오면 바꾼다 — 지금은 `Background/grey` 칸.
 */
export const zone = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 180,
  aspectRatio: '180 / 254',
  overflow: 'hidden',
  border: '1px solid transparent',
  borderRadius: vars.radius[3],
  background: vars.color.background.grey,
  transition: 'border-color 120ms ease, background-color 120ms ease',
  selectors: {
    '&[data-dragging="true"]': {
      borderColor: vars.color.brand.primary,
      borderStyle: 'dashed',
      background: vars.color.brand.primarySubtle,
    },
    '&[data-invalid="true"]': { borderColor: vars.color.status.error },
    '&[data-disabled="true"]': { background: vars.color.interaction.disabledBg },
  },
});

export const preview = style({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const action = style({ position: 'relative' });

/** GUI 버튼 아이콘은 20 */
export const buttonIcon = style({ width: 20, height: 20 });

export const hiddenInput = style({ display: 'none' });
