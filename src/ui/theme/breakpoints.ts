/**
 * 브레이크포인트(P1 확정 — design-system §2). 데스크탑은 1024px 이상.
 * Figma 그리드는 Mobile 390, Desktop-sm 1280, Desktop-lg 1440이고, 1024~1279는 1280 배치를 줄여 쓴다.
 * 호스팅 센터 3단(사이드바 255 + 본문 + 우측 패널 392)은 `wide`(1280 이상)에서만 3단, 그 아래에서는 우측 패널을 본문 아래로 내린다.
 */
export const breakpoints = { desktop: 1024, wide: 1280 } as const;

export const media = {
  desktop: `screen and (min-width: ${breakpoints.desktop}px)`,
  wide: `screen and (min-width: ${breakpoints.wide}px)`,
} as const;
