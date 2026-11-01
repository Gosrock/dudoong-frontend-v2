import { style } from '@vanilla-extract/css';

import { HEADER_HEIGHT, SHELL_BAR_SPACE_VAR, TOP_BAR_HEIGHT } from '@/ui/theme/bars';
import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

/**
 * 상단 바 고정 — PC `TopBar` · 모바일 로고 헤더 · 하위 화면 헤더 · 공연 모바일 헤더 · 티켓 폼 헤더.
 *
 * `position: fixed`(이슈 #95, 사용자 요청 2026-11-01). 처음(fix-qa-1101)은 `sticky`였는데, 문서 스크롤의 고무줄
 * 오버스크롤(iOS Safari · macOS 트랙패드)에서 sticky는 흐름 안 요소라 콘텐츠와 같이 밀렸다. fixed는 뷰포트에 붙어
 * 콘텐츠만 오버스크롤된다. 스크롤은 계속 문서(window)가 한다 — 주소창 숨김 · 당겨서 새로고침 · 스크롤 복원을 그대로 둔다
 * (tech-decisions §33). 바 자리는 셸의 `barSpace`가 흐름 안에 잡는다 — 바마다 자리를 두지 않는다(페이지 안 헤더도 같은 자리).
 *
 * - z-index는 `header` 토큰 — 오버레이(Radix 포털, `sheet` 이상)보다 아래.
 * - 오른쪽 끝: 오버레이가 스크롤을 잠그며 스크롤바 폭만큼 body에 여백을 주면(react-remove-scroll) 그 폭을
 *   `--removed-body-scroll-bar-size`로 알려 준다 — 바 안 오른쪽 버튼이 옆으로 튀지 않게 같이 뺀다.
 * - 바 자체(`Header`·`TopBar`)가 흰 배경을 갖는다.
 */
export const fixedBar = style({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 'var(--removed-body-scroll-bar-size, 0px)',
  zIndex: vars.zIndex.header,
});

/**
 * 고정 상단 바의 자리(흐름 안). 모바일 64(`Header`) · PC 58(`TopBar`). 셸 맨 위에 하나 — 서비스 배너는 이 아래에서
 * 스크롤돼 바 밑으로 사라진다.
 */
export const barSpace = style({
  flexShrink: 0,
  height: HEADER_HEIGHT,
  '@media': { [media.desktop]: { height: TOP_BAR_HEIGHT } },
});

/** 셸 루트에 — 고정 바 자리 높이를 CSS 변수로 알린다(`FULL_SCREEN_MIN_HEIGHT`가 뺀다) */
export const shellBarSpaceVars = style({
  vars: { [SHELL_BAR_SPACE_VAR]: `${HEADER_HEIGHT}px` },
  '@media': { [media.desktop]: { vars: { [SHELL_BAR_SPACE_VAR]: `${TOP_BAR_HEIGHT}px` } } },
});
