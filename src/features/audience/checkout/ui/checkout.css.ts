import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';
import { typography } from '@/ui/theme/typography.css';

/** 체크아웃 화면 조각(폼 · 동의 · 규정 · 결제)이 같이 쓰는 모양 */

/**
 * 맞닿는 줄의 선을 한 줄로 — `Accordion`·InfoRow second는 위·아래 선을 다 가져서, 이어 놓으면 앞 줄 아래 선과 겹쳐 2px이 된다.
 * GUI는 1px 한 줄이라 위로 1px 겹쳐 놓는다.
 */
export const collapseTopLine = style({ marginTop: -1 });

/** 본문 속 링크(이용약관 · 공연 상세 · 마이페이지) — 공연 상세 `textLink`와 같은 밑줄 */
export const textLink = style({ color: 'inherit', textDecoration: 'underline' });

/** 동의 항목 번호 목록(①②…은 원문 글머리표 — legal-copy 읽는 법) */
export const agreementList = style([
  typography.labelSm,
  {
    margin: 0,
    color: vars.color.text.secondaryLabel,
    display: 'flex',
    flexDirection: 'column',
    gap: vars.space[1],
  },
]);

/**
 * 판매정보 회색 상자(GUI `1952:49360` · `1952:50156` — 채움 `surface/container` 변수 · 안쪽 24 · 줄 사이 16). 직접 그린 상자
 * FIGMA-CUSTOM: 판매정보 회색 상자(gui 1952:49360 · 1952:50156 직접 그린 상자) → Figma대로 커스텀. DS 후보 없음(옵션 응답 상자 `optionBox`와 같은 판)
 */
export const grayBox = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  padding: vars.space[5],
  background: vars.color.surface.container,
});

/** 회색 상자 안 번호 목록 — `Body/sm` 13 · `text/secondary-label`(GUI `1952:49362` · `1952:50161`, 항목 사이 간격 없음) */
export const bodyList = style([
  typography.bodySm,
  {
    margin: 0,
    paddingInlineStart: vars.space[5],
    color: vars.color.text.secondaryLabel,
  },
]);

/** 회색 상자 안 문단 — 목록과 같은 글자 */
export const bodyText = style([
  typography.bodySm,
  { margin: 0, color: vars.color.text.secondaryLabel },
]);
