import { globalStyle, style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 마이페이지 · 주문내역 · 주문상세 · 관심 호스트 · 아카이빙 공용 배치(P9-V — 와이어 근거, DS 토큰만).
 * 모바일 와이어는 390 한 열(`128:2772` 등), PC 와이어(`668:5085`·`668:5805`·`667:4078`·`671:6692`)는 가운데 열 + 위 제목.
 * PC 폭은 와이어 주문내역(1440 프레임 안 좌우 약 115)에서 잰 값 대신 체크아웃과 같은 가운데 열로 둔다(🤖 — 와이어 수준).
 */
export const page = style({
  flex: '1 0 auto',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  paddingBottom: vars.space[7],
  '@media': {
    [media.desktop]: {
      maxWidth: 960,
      margin: '0 auto',
      paddingTop: vars.space[7],
    },
  },
});

/** 좁은 한 열(마이페이지 · 주문상세) — PC에서도 640 */
export const narrowPage = style([page, { '@media': { [media.desktop]: { maxWidth: 640 } } }]);

/** 화면 제목(h1). 모바일은 하위 헤더가 제목을 보이므로 숨기고(읽기 전용), PC는 가운데 제목(와이어 PC `668:5085`) */
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
      textAlign: 'center',
      paddingBottom: vars.space[5],
    },
  },
});

/** 목록 위 오른쪽 고정 라벨 줄("최근주문순" — Q36) */
export const toolbar = style({
  display: 'flex',
  justifyContent: 'flex-end',
  padding: `${vars.space[3]} ${vars.space[5]}`,
  borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
});

export const list = style({ listStyle: 'none', margin: 0, padding: 0 });

/** 목록 행 사이 선(와이어 주문 카드 구분선) */
export const row = style({
  borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
});

/** 섹션 사이 회색 띠(체크아웃과 같은 섹션 간격) */
export const sectionGap = style({
  height: vars.space[4],
  background: vars.color.surface.container,
  flexShrink: 0,
});

/** 옵션 응답 영역(체크아웃 `optionBox`와 같은 회색 판) */
export const optionBox = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  padding: `${vars.space[4]} ${vars.space[5]} ${vars.space[5]}`,
  background: vars.color.surface.container,
});

export const divider = style({
  height: 1,
  margin: `0 ${vars.space[5]}`,
  background: vars.color.surface.defaultBorder,
});

/** 안내 상자(거절 사유 · 환불 계좌 유도 · 취소 안내) */
export const notice = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  margin: `${vars.space[4]} ${vars.space[5]}`,
  padding: `${vars.space[3]} ${vars.space[4]}`,
  borderRadius: vars.radius[2],
  background: vars.color.surface.container,
});

/** 시트 · 모달 안 안내 상자(좌우 여백은 시트가 준다) */
export const sheetNotice = style([notice, { margin: 0 }]);

export const warningNotice = style([notice, { background: vars.color.status.warningSubtle }]);

export const noticeList = style({
  margin: 0,
  paddingLeft: vars.space[4],
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
});

/** 포스터 상자(와이어 회색 상자 — 서버 포스터가 없으면 `surface.imageBg`, Q26 기본안) */
export const poster = style({
  position: 'relative',
  flexShrink: 0,
  width: 76,
  aspectRatio: '3 / 4',
  overflow: 'hidden',
  borderRadius: vars.radius[2],
  background: vars.color.surface.imageBg,
  '@media': { [media.desktop]: { width: 120 } },
});

export const posterImage = style({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

/** 포스터 위 D-n · 공연종료 칩(와이어 `128:2772` 오른쪽 위) */
export const posterChip = style({
  position: 'absolute',
  top: vars.space[1],
  right: vars.space[1],
});

export const cardLink = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  padding: `${vars.space[4]} ${vars.space[5]}`,
  color: 'inherit',
  textDecoration: 'none',
});

export const grow = style({ flex: 1, minWidth: 0 });

/** 하단 [목록] 버튼 자리(와이어 주문상세 맨 아래) */
export const bottomAction = style({
  padding: `${vars.space[5]} ${vars.space[5]} 0`,
});

/** 아카이빙 포스터 그리드(와이어 `503:16328` 2열, PC `671:6692` 4열) */
export const grid = style({
  listStyle: 'none',
  margin: 0,
  padding: `${vars.space[4]} ${vars.space[5]}`,
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: `${vars.space[5]} ${vars.space[4]}`,
  '@media': { [media.desktop]: { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' } },
});

export const gridPoster = style({
  position: 'relative',
  width: '100%',
  aspectRatio: '1 / 1',
  overflow: 'hidden',
  borderRadius: vars.radius[2],
  background: vars.color.surface.imageBg,
});

export const gridItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  alignItems: 'center',
  textAlign: 'center',
  color: 'inherit',
  textDecoration: 'none',
});

/** 마이페이지 메뉴 행(와이어 햄버거 `128:2875` 아이콘 + 글자) */
export const menuRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  width: '100%',
  padding: `${vars.space[3]} ${vars.space[5]}`,
  border: 0,
  background: 'none',
  color: vars.color.text.primaryLabel,
  textAlign: 'left',
  textDecoration: 'none',
  cursor: 'pointer',
  selectors: { '&:hover': { background: vars.color.surface.container } },
});

/** 프로필 아바타 + 편집 배지(와이어 `128:2875` 연필) */
export const avatarWrap = style({ position: 'relative', flexShrink: 0 });

export const editBadge = style({
  position: 'absolute',
  right: -2,
  bottom: -2,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: vars.radius.full,
  border: `2px solid ${vars.color.background.normal}`,
  background: vars.color.text.secondaryLabel,
  color: vars.color.text.inverse,
  cursor: 'pointer',
});

export const chipRow = style({ display: 'inline-flex', flexWrap: 'wrap', gap: vars.space[1] });

export const editIcon = style({ width: 16, height: 16 });

export const visuallyHidden = style({
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
});

export const tabsBar = style({ padding: `0 ${vars.space[5]}` });

export const stateBox = style({ padding: `${vars.space[7]} ${vars.space[5]}` });

export const plainLink = style({ color: 'inherit', textDecoration: 'none' });

export const preLine = style({ whiteSpace: 'pre-line' });

/** 관심 해제 하트(P5c 호스트 홈 ♡와 같은 모양 — 눌린 상태 = 채운 하트, 브랜드 색) */
export const heart = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 44,
  height: 44,
  padding: 0,
  border: 0,
  borderRadius: vars.radius.full,
  background: 'transparent',
  color: vars.color.text.primaryLabel,
  cursor: 'pointer',
  selectors: {
    '&[aria-pressed="true"]': { color: vars.color.brand.primary },
    '&:disabled': { color: vars.color.interaction.disabled, cursor: 'default' },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});

globalStyle(`${heart}[aria-pressed="true"] svg path`, { fill: 'currentColor' });

export const hostRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  padding: `${vars.space[3]} ${vars.space[5]}`,
});

export const filterBar = style({
  display: 'flex',
  justifyContent: 'flex-end',
  padding: `${vars.space[3]} ${vars.space[5]}`,
  borderBottom: `1px solid ${vars.color.surface.defaultBorder}`,
});

export const filterDropdown = style({ width: 160 });

/** 주문상세 결제정보 아래 [토스 앱에서 송금하기](B23) — 행 좌우 여백에 맞춘다 */
export const tossTransfer = style({
  padding: `${vars.space[2]} ${vars.space[5]} ${vars.space[3]}`,
});
