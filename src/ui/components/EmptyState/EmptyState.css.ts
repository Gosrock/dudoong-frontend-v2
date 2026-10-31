import { style } from '@vanilla-extract/css';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

export const root = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  padding: `${vars.space[7]} ${vars.space[5]}`,
  textAlign: 'center',
});

/** 일러스트 자리 — GUI 170×170 */
export const illustration = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: vars.space[1],
});

export const texts = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.space[2],
});

export const actions = style({
  display: 'flex',
  gap: vars.space[2],
  marginTop: vars.space[5],
});

/**
 * GUI 빈 화면 버튼(`37:758`·`579:2210`) — Button Primary Large 인스턴스의 채움을 검정(text/primary-label)으로 덮어쓴 것.
 * 높이 48(Large 56과 다름), 모서리 12, 글자 Label/lg emphasized. 링크로도 써야 해서 `Button variant="dark"`와 별도로 둔다.
 */
export const blackButton = style([
  typography.labelLgEmphasized,
  {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 170,
    height: 48,
    padding: `0 ${vars.space[5]}`,
    border: 0,
    borderRadius: vars.radius[4],
    background: vars.color.text.primaryLabel,
    color: vars.color.text.inverse,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    selectors: {
      '&:hover': { opacity: 0.9 },
      '&:active': { opacity: 0.8 },
      '&:disabled': {
        cursor: 'not-allowed',
        background: vars.color.interaction.disabledBg,
        color: vars.color.interaction.disabledText,
        opacity: 1,
      },
    },
  },
]);
