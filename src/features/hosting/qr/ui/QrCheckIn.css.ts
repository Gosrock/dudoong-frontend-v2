import { globalStyle, style, styleVariants } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';
import { typographySpecs } from '@/ui/theme/typography.css';

/**
 * QR 체크인 — **GUI 근거**(P13b-GUI, Design Sync #215~#234). 모바일 `1360:13479`(390) · 데스크탑 `1352:30715`(1440)을
 * 같은 DOM에 CSS로 나눈다(1024부터 PC, patterns §1). 값은 Ready 프레임에서 잰 것을 토큰으로.
 *
 * FIGMA-CUSTOM: 통계 칸 · 카메라 자리 · 결과 카드 · 티켓 번호 결과 카드 · 카메라 상태 안내(gui `1360:13486` 등 "전체 티켓"
 * · `1360:13501` "카메라_결과" · `1362:1295` "QR 결과 카드" · `1368:4838` "티켓 번호 결과 카드" · `1360:23233` "QR 체크인_카메라"
 * · `1360:25870` "QR 체크인_불가") 커스텀 → 이 파일. 모두 GUI 파일의 로컬 컴포넌트 · 직접 그린 상자(DS 아님 — R1 화면대로).
 * 결과 카드 둘은 DS 후보(design-system §3)
 */

/* ── 본문 ─────────────────────────────────────────── */

/** 본문 — 모바일 위 12 · 좌우 24 · 사이 16(`1360:13484`), PC 위아래 28 · 좌우 24 · 사이 20(`1352:30743`) */
export const page = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  width: '100%',
  boxSizing: 'border-box',
  padding: `${vars.space[3]} ${vars.space[5]} ${vars.space[6]}`,
  '@media': {
    [media.desktop]: {
      gap: 20,
      padding: `28px ${vars.space[5]}`,
    },
  },
});

/** PC만 — 모바일은 헤더 제목("QR 체크인 ▾")이 대신한다. PC 제목 아래 24(`1352:30744` 아래 패딩) + 사이 20 */
export const desktopTitle = style({
  margin: 0,
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  '@media': {
    [media.desktop]: {
      position: 'static',
      width: 'auto',
      height: 'auto',
      overflow: 'visible',
      clip: 'auto',
      paddingBottom: vars.space[5],
    },
  },
});

/* ── 통계 ─────────────────────────────────────────── */

/** 모바일 사이 8(`1360:13485`), PC 12(`1352:30747`) */
export const statGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: vars.space[2],
  margin: 0,
  '@media': { [media.desktop]: { gap: vars.space[3] } },
});

/** 회색 칸(r20) — 라벨 위 · 숫자 아래 · 가운데, 모바일 16/12 · PC 24/16, 사이 8 */
export const statBox = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.space[2],
  padding: `${vars.space[4]} ${vars.space[3]}`,
  borderRadius: vars.radius[6],
  background: vars.color.surface.container,
  margin: 0,
  '@media': { [media.desktop]: { padding: `${vars.space[5]} ${vars.space[4]}` } },
});

export const statValue = style({ margin: 0 });

/** 숫자 — 모바일 `Heading/md2 - emphasized`(18), PC `Heading/lg - emphasized`(24) */
export const statNumber = style({
  '@media': {
    [media.desktop]: {
      fontSize: typographySpecs.headingLgEmphasized.size,
      lineHeight: typographySpecs.headingLgEmphasized.lineHeight,
    },
  },
});

/** 막대 12h r6(`1360:13496`) */
export const track = style({
  position: 'relative',
  height: vars.space[3],
  overflow: 'hidden',
  borderRadius: 6,
  background: vars.color.surface.defaultBorder,
});

export const fill = style({
  position: 'absolute',
  insetBlock: 0,
  left: 0,
  background: vars.color.brand.primary,
});

/* ── 탭 + 카메라 / QR 자리 ─────────────────────────── */

export const panel = style({ display: 'flex', flexDirection: 'column' });

/**
 * 카메라 / QR 자리 — 모바일 342×400 · PC 1124×442, r24(`1360:13501` · `1352:30763`). 카메라가 나오면 검정(`background/dark`),
 * 켜는 중 · 실패 · 막힘 · 관객 QR은 회색(`background/grey` — `1360:23233` · `1360:25870` · `1360:25934`)
 */
export const stage = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: 400,
  overflow: 'hidden',
  boxSizing: 'border-box',
  borderRadius: vars.radius[7],
  background: vars.color.background.grey,
  '@media': { [media.desktop]: { height: 442 } },
});

export const stageDark = style({ background: vars.color.background.darkFixed });

/**
 * 전체화면 — 셸 · 상단 바를 덮는다(`1359:398` 모바일 · `1352:30986` PC · 관객 `1360:27107`). 뒤로가기 · [✕]로 닫는다
 */
export const stageFullscreen = style({
  position: 'fixed',
  inset: 0,
  zIndex: vars.zIndex.modal,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  // 덮은 채로 끌어도 뒤 문서가 스크롤 · 고무줄 되지 않게(이슈 #95) — 탭(버튼)은 그대로 된다
  touchAction: 'none',
  overscrollBehavior: 'none',
  background: vars.color.background.grey,
});

/**
 * 자리 오른쪽 위 흰 원 버튼 — 전체화면 전환(⤢) · 닫기(✕). 모바일 44(위 · 오른쪽 16 — `1360:25996`), PC 56(24 — `1349:797`
 * DS Button Secondary round 56). 전체화면 닫기는 모바일 44(`1359:404`) · PC 56 위 · 오른쪽 36(`1352:30986`)
 */
export const cornerButton = style({
  position: 'absolute',
  top: vars.space[4],
  right: vars.space[4],
  zIndex: 3,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 44,
  height: 44,
  padding: 0,
  border: 'none',
  borderRadius: vars.radius.full,
  background: vars.color.background.normal,
  color: vars.color.text.primary,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: vars.color.surface.container },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
  '@media': {
    [media.desktop]: { top: vars.space[5], right: vars.space[5], width: 56, height: 56 },
  },
});

/** 전체화면의 [✕] — 안전 영역 아래(모바일 상태 표시줄), PC 36 */
export const cornerButtonFullscreen = style({
  top: `calc(env(safe-area-inset-top, 0px) + ${vars.space[4]})`,
  '@media': { [media.desktop]: { top: 36, right: 36 } },
});

/* ── 카메라 ───────────────────────────────────────── */

export const scannerContainer = style({ position: 'absolute', inset: 0 });
globalStyle(`${scannerContainer} video`, { width: '100%', height: '100%', objectFit: 'cover' });
export const scannerVideo = style({ width: '100%', height: '100%', objectFit: 'cover' });

/**
 * 스캔 가이드(네 모서리, `1360:13502`) — 모바일 180 · PC 250, 전체화면 240(`1359:399`) · PC 360(`1352:30986`).
 * 흰 선 3 · 모서리 둥근 꺾쇠. 라이브러리의 파인더 대신 Figma 모양을 그린다
 */
export const guide = style({
  position: 'absolute',
  top: '50%',
  left: '50%',
  zIndex: 1,
  width: 180,
  height: 180,
  transform: 'translate(-50%, -50%)',
  pointerEvents: 'none',
  '@media': { [media.desktop]: { width: 250, height: 250 } },
});

export const guideFullscreen = style({
  width: 240,
  height: 240,
  '@media': { [media.desktop]: { width: 360, height: 360 } },
});
globalStyle(`${guideFullscreen} > span`, {
  '@media': { [media.desktop]: { width: 62, height: 62 } },
});

/** 꺾쇠 한 변 42(모바일 · PC 모두 `1360:13502` · `1352:31250`), PC 전체화면 62(`1352:30986`) */
const cornerBase = style({
  position: 'absolute',
  width: 42,
  height: 42,
  borderColor: vars.color.text.inverse,
  borderStyle: 'solid',
  borderWidth: 0,
});
export const guideCorner = styleVariants({
  tl: [
    cornerBase,
    { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: vars.radius[4] },
  ],
  tr: [
    cornerBase,
    {
      top: 0,
      right: 0,
      borderTopWidth: 3,
      borderRightWidth: 3,
      borderTopRightRadius: vars.radius[4],
    },
  ],
  bl: [
    cornerBase,
    {
      bottom: 0,
      left: 0,
      borderBottomWidth: 3,
      borderLeftWidth: 3,
      borderBottomLeftRadius: vars.radius[4],
    },
  ],
  br: [
    cornerBase,
    {
      bottom: 0,
      right: 0,
      borderBottomWidth: 3,
      borderRightWidth: 3,
      borderBottomRightRadius: vars.radius[4],
    },
  ],
});

/** "티켓 QR을 카메라에 비춰 주세요" — 검정 85% 알약, 12/24, `Label/lg - emphasized` 흰 글자(`1360:13584`). 자리 아래쪽 */
export const hint = style({
  position: 'absolute',
  left: '50%',
  bottom: vars.space[3],
  zIndex: 1,
  transform: 'translateX(-50%)',
  padding: `${vars.space[3]} ${vars.space[5]}`,
  borderRadius: vars.radius[7],
  background: vars.color.overlay.dim,
  color: vars.color.text.inverse,
  whiteSpace: 'nowrap',
  '@media': { [media.desktop]: { bottom: vars.space[4] } },
});

export const hintFullscreen = style({
  bottom: `calc(env(safe-area-inset-bottom, 0px) + ${vars.space[8]})`,
  '@media': { [media.desktop]: { bottom: vars.space[3] } },
});

/**
 * 카메라 상태 안내(켜는 중 · 켜지지 않나요 · 실패 5종 · 공연 상태로 막힘) — 회색 자리 가운데, 아이콘 48 → 제목 → 설명 → 버튼(위 12),
 * 사이 12, 좌우 24(`1360:23233` · `1360:25870`)
 */
export const cameraNotice = style({
  position: 'absolute',
  inset: 0,
  zIndex: 2,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: vars.space[3],
  padding: `0 ${vars.space[5]}`,
  boxSizing: 'border-box',
  textAlign: 'center',
  background: vars.color.background.grey,
});

/** 모바일은 글자 칸 폭이 좁다(제목 216 · 설명 220 — `1360:23228`). PC는 자리 폭 */
export const noticeText = style({
  maxWidth: 220,
  margin: 0,
  '@media': { [media.desktop]: { maxWidth: 'none' } },
});

/** 막힘 제목 — 회색 글자(`text/tertiary` — `1360:25864`) */
export const noticeTitleMuted = style({ maxWidth: 216 });

export const noticeIcon = style({
  display: 'inline-flex',
  color: vars.color.text.tertiary,
});
globalStyle(`${noticeIcon} > svg`, { width: 48, height: 48 });

export const noticeAction = style({ paddingTop: vars.space[3] });

/* ── QR 결과 카드(`1362:1295`) ────────────────────── */

/**
 * 카드 자리 — 카메라 위 아래쪽. 모바일 좌우 · 아래 12(`1362:2224`), PC 가운데 480 · 아래 24(`1362:2054`),
 * 전체화면 모바일 좌우 16 · 아래 34(`1367:4189`), PC 480 · 아래 40(`1367:4147`)
 */
export const resultDock = style({
  position: 'absolute',
  left: vars.space[3],
  right: vars.space[3],
  bottom: vars.space[3],
  zIndex: 2,
  display: 'flex',
  justifyContent: 'center',
  '@media': { [media.desktop]: { bottom: vars.space[5] } },
});

export const resultDockFullscreen = style({
  left: vars.space[4],
  right: vars.space[4],
  bottom: `calc(env(safe-area-inset-bottom, 0px) + 34px)`,
  '@media': { [media.desktop]: { bottom: vars.space[7] } },
});

/** 흰 카드 r20 · 24 · 사이 16 · 그림자(DS `drop shadow`) */
export const resultCard = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  width: '100%',
  maxWidth: 480,
  boxSizing: 'border-box',
  padding: vars.space[5],
  borderRadius: vars.radius[6],
  background: vars.color.background.normal,
  boxShadow: vars.shadow.drop,
});

/** 머리 — 아이콘 32 + 제목 · 설명(사이 12) */
export const resultHead = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
});

export const toneIcon = style({ display: 'inline-flex', flexShrink: 0 });
globalStyle(`${toneIcon}[data-size="32"] > svg`, { width: 32, height: 32 });

/** 확인 중 스피너 — 보라(DS Spinner 덮어쓴 색 `1362:1289`) */
export const checkingSpinner = style({ display: 'inline-flex', color: vars.color.brand.primary });

/** 이름 · 티켓 · 티켓 번호 — 회색 판 r12 · 16 · 사이 8, 라벨 칸 80 · 사이 12(`1362:1206` 로컬 `정보 줄`) */
export const ticketList = style({
  display: 'grid',
  gridTemplateColumns: '80px minmax(0, 1fr)',
  columnGap: vars.space[3],
  rowGap: vars.space[2],
  margin: 0,
  padding: vars.space[4],
  borderRadius: vars.radius[4],
  background: vars.color.surface.container,
});
globalStyle(`${ticketList} dt, ${ticketList} dd`, { margin: 0, minWidth: 0 });
globalStyle(`${ticketList} dd`, { overflowWrap: 'anywhere' });

/* ── 관객이 스캔(QR) ──────────────────────────────── */

/** QR 흰 판 230 r24(`1360:26009`), QR 156 — 사이 여백이 QR의 quiet zone */
export const qrCard = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 230,
  height: 230,
  boxSizing: 'border-box',
  borderRadius: vars.radius[7],
  background: vars.color.background.normal,
});

export const qrImage = style({ width: 156 });

/** 안내 — `Label/lg`, 위아래 12 · 좌우 24(`1360:25940`), QR 판과 사이 12 */
export const qrCaption = style({ padding: `${vars.space[3]} ${vars.space[5]}`, margin: 0 });

/**
 * 관객 전체화면(`1360:27107`, PC만 그려짐) — 로고 → 공연 이름(Kartrider 48) → QR 판 486(r≈50) → 안내 `Heading/2xl`.
 * 모바일 전체화면은 그려지지 않아 같은 순서를 화면 폭에 맞춰 줄인다 🤖
 */
export const audienceFull = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.space[6],
  padding: vars.space[5],
  boxSizing: 'border-box',
  maxHeight: '100dvh',
  textAlign: 'center',
});

export const audienceTitle = style({
  margin: 0,
  fontFamily: vars.font.display,
  fontWeight: 800,
  fontSize: 28,
  lineHeight: '130%',
  letterSpacing: '-0.01em',
  color: vars.color.text.primary,
  '@media': { [media.desktop]: { fontSize: 48 } },
});

export const qrCardLarge = style({
  width: 'min(80vw, 46dvh, 486px)',
  height: 'min(80vw, 46dvh, 486px)',
  borderRadius: `calc(${vars.radius[7]} * 2)`,
});

export const qrImageLarge = style({ width: '68%' });

/** 안내 — PC `Heading/2xl`(32), 모바일은 그려지지 않아 20으로 줄인다 🤖 */
export const audienceCaption = style({
  margin: 0,
  fontSize: 20,
  '@media': { [media.desktop]: { fontSize: typographySpecs.heading2xl.size } },
});

/* ── 티켓 번호로 입장(PQ-2b — #926) ─────────────────────── */

/**
 * 구분선 아래 — 모바일은 위에서 아래로(제목 · 입력 줄 · 도움말 · 카드, 사이 12 — `1368:5238`),
 * PC는 왼쪽 480에 입력, 오른쪽에 카드(`1368:5083`)
 */
export const ticketNoBox = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  rowGap: vars.space[3],
  paddingTop: vars.space[4],
  borderTop: `1px solid ${vars.color.surface.defaultBorder}`,
  '@media': {
    [media.desktop]: {
      gridTemplateColumns: 'minmax(0, 480px) minmax(0, 1fr)',
      columnGap: vars.space[5],
      paddingTop: 20,
      alignItems: 'start',
    },
  },
});

export const ticketNoFormCol = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  minWidth: 0,
});

export const ticketNoForm = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: vars.space[2],
});

export const ticketNoInput = style({ flex: '1 1 auto', minWidth: 0 });

/** 번호 결과 카드 — 흰 판 · 테두리 · r16 · 16 · 사이 12(`1368:4799`) */
export const ticketNoCard = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  minWidth: 0,
  padding: vars.space[4],
  borderRadius: vars.radius[5],
  border: `1px solid ${vars.color.surface.defaultBorder}`,
  background: vars.color.background.normal,
});

/** 머리 — 아이콘 24 + 제목 · 설명(사이 8) */
export const ticketNoHead = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: vars.space[2],
});

/** 관객 정보 — 회색 판 r12 · 16 · 사이 4: 번호(`Label/sm`) · 이름(`Heading/lg - emphasized`) · 티켓(`Body/md`) */
export const ticketNoOwner = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  padding: vars.space[4],
  borderRadius: vars.radius[4],
  background: vars.color.surface.container,
});

export const ticketNoFoot = style({ display: 'flex', justifyContent: 'flex-end' });
