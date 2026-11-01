/**
 * 상단 바 높이 — PC `TopBar`(디자인 시스템 `Top bar_Host` 1440×58) · 모바일 `Header`(Top app bar 390×64).
 * 상단 바가 화면 위에 고정이라(fix-qa-1101, 사용자 요청 2026-11-01) 그 아래에 붙는 것(호스팅 공연 사이드바 · 공연 상세 PC 오른쪽 카드)과
 * 포커스·앵커 스크롤 여백(`scroll-padding-top`)이 이 값을 쓴다.
 */
export const TOP_BAR_HEIGHT = 58;
export const HEADER_HEIGHT = 64;

/**
 * 셸이 맨 위에 잡은 고정 바 자리 높이(이슈 #95). 셸 루트가 이 CSS 변수에 64/58을 넣는다 — "화면 높이를 채우는" 대기 화면
 * (`LoginGate` · `ScreenLoader fullScreen`)이 `100dvh - 이 값`만 채워 셸 안에서 바 높이만큼 넘치지 않게. 셸 밖(호스팅 게이트)은 0.
 */
export const SHELL_BAR_SPACE_VAR = '--shell-bar-space';
export const FULL_SCREEN_MIN_HEIGHT = `calc(100dvh - var(${SHELL_BAR_SPACE_VAR}, 0px))`;
