import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';
import { typography } from '@/ui/theme/typography.css';

/**
 * 체크아웃(GUI `564:4156` 등 — 390 모바일만 Ready). PC(1024~)는 그림이 없어 같은 한 열을 가운데 640으로 둔다.
 */
export const page = style({
  flex: '1 0 auto',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  '@media': {
    [media.desktop]: {
      maxWidth: 640,
      margin: '0 auto',
      paddingTop: vars.space[7],
    },
  },
});

/** 화면 제목(h1). 모바일은 하위 헤더가 공연 이름을 보이므로 글자를 숨기고(읽기 전용), PC는 보인다 */
export const title = style({
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  '@media': {
    [media.desktop]: {
      position: 'static',
      width: 'auto',
      height: 'auto',
      overflow: 'visible',
      clip: 'auto',
      whiteSpace: 'normal',
      padding: `0 ${vars.space[5]} ${vars.space[5]}`,
    },
  },
});

export const form = style({ flex: '1 0 auto', display: 'flex', flexDirection: 'column' });

/** 섹션 사이 회색 띠(Figma 섹션 간격 — 배경 `Background/grey` 위에 흰 섹션) */
export const sectionGap = style({
  height: vars.space[4],
  background: vars.color.surface.container,
  flexShrink: 0,
});

/** 옵션 응답 영역(GUI `567:9738` 390 · 채움 `#F7F7F6` 변수 — 패딩 24 · 옵션 사이 선) */
export const optionBox = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  padding: `${vars.space[4]} ${vars.space[5]} ${vars.space[5]}`,
  background: vars.color.surface.container,
});

export const optionDivider = style({
  height: 1,
  background: vars.color.surface.defaultBorder,
});

export const errorBanner = style({
  margin: `${vars.space[3]} ${vars.space[5]} 0`,
  padding: `${vars.space[3]} ${vars.space[4]}`,
  borderRadius: vars.radius[2],
  background: vars.color.status.warningSubtle,
});

/** 오류 문구 아래 버튼(주문 결과 미확인 → 주문내역) */
export const errorBannerAction = style({ marginTop: vars.space[2] });

/** 총 결제금액 위 선(GUI `567:7924` LINE — 좌우 24 안쪽) */
export const totalDivider = style({
  height: 1,
  margin: `0 ${vars.space[5]}`,
  background: vars.color.surface.defaultBorder,
});

export const paymentChannels = style({ padding: `${vars.space[4]} ${vars.space[5]}` });

/** 하단 동의 + CTA(GUI 프레임 맨 아래). 길어도 늘 보이게 붙여 둔다 */
export const bottomBar = style({
  position: 'sticky',
  bottom: 0,
  zIndex: 1,
  marginTop: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  padding: `${vars.space[5]} ${vars.space[5]}`,
  paddingBottom: `calc(${vars.space[5]} + env(safe-area-inset-bottom))`,
  background: vars.color.background.normal,
});

export const agree = style({ display: 'flex', justifyContent: 'center' });

/** 입금 확인 다이얼로그 안 요약(DS `다이얼로그 - 결제 요약` `772:1195` 회색 판 — 모서리 12 · 패딩 16) */
export const summaryBox = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  padding: vars.space[4],
  borderRadius: vars.radius[4],
  background: vars.color.surface.container,
});

export const summaryRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.space[3],
  minWidth: 0,
});

export const summaryValue = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[2],
  minWidth: 0,
  textAlign: 'right',
  overflowWrap: 'anywhere',
});

export const summaryDivider = style({ height: 1, background: vars.color.surface.defaultBorder });

/**
 * 맞닿는 줄의 선을 한 줄로 — `Accordion`·InfoRow second는 위·아래 선을 다 가져서, 이어 놓으면 앞 줄 아래 선과 겹쳐 2px이 된다.
 * GUI는 1px 한 줄이라 위로 1px 겹쳐 놓는다.
 */
export const collapseTopLine = style({ marginTop: -1 });

/** 주문 동의(② 호스트 제공 동의) — 디자인 없음(Q42). 섹션 좌우 24 · 위 20, 펼침은 DS Accordion */
export const agreement = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  paddingTop: vars.space[5],
});

export const agreementCheck = style({ paddingInline: vars.space[5] });

/** [자세히] 펼친 항목 — Accordion 행과 같은 좌우 24 */
export const agreementDetailBody = style({
  padding: `${vars.space[3]} ${vars.space[5]} ${vars.space[4]} calc(${vars.space[5]} + ${vars.space[5]})`,
});

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

/** ③ 입금 전 확인(두둥) — 결제 요약 아래 */
export const notice = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  marginTop: vars.space[4],
});

/** ③ 고지 목록 — 글머리 자리 */
export const noticeList = style({ margin: 0, paddingInlineStart: vars.space[5] });

/** 본문 속 링크(이용약관 · 공연 상세 · 마이페이지) — 공연 상세 `textLink`와 같은 밑줄 */
export const textLink = style({ color: 'inherit', textDecoration: 'underline' });

/** 결제정보 첫 줄 아래 닉네임 안내(이슈 #106 §4) — InfoRow와 같은 좌우 24 */
export const depositorHint = style({
  padding: `${vars.space[2]} ${vars.space[5]} ${vars.space[3]}`,
});

/** 취소·환불 규정(이슈 #105) */
export const refundPolicy = style({ display: 'flex', flexDirection: 'column' });

export const refundPolicyLinks = style([
  typography.labelMd,
  {
    padding: `0 ${vars.space[5]} ${vars.space[4]}`,
    color: vars.color.text.secondaryLabel,
  },
]);
