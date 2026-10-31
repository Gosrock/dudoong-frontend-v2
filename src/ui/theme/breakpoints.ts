/**
 * 브레이크포인트(design-system §2, gui-screens §3). **관객·호스팅 모두 1024px부터 데스크탑**(사용자 결정 2026-10-31, Q38 닫힘).
 * 레이아웃이 모바일 ↔ 데스크탑으로 바뀌는 경계는 `desktop` 하나다.
 * `desktopS`·`desktopL`은 데스크탑 안에서 폭 값만 바뀌는 곳에 쓴다 — GUI 반응형 스펙의 Desktop s(1280~)·Desktop L(1440~).
 * 호스팅 대시보드 우측 일정 패널 286 → 335 → 388, `Container` 좌우 여백 40 → 80.
 */
export const breakpoints = { desktop: 1024, desktopS: 1280, desktopL: 1440 } as const;

export const media = {
  desktop: `screen and (min-width: ${breakpoints.desktop}px)`,
  desktopS: `screen and (min-width: ${breakpoints.desktopS}px)`,
  desktopL: `screen and (min-width: ${breakpoints.desktopL}px)`,
} as const;
