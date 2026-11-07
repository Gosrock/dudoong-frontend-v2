/**
 * 떠 있는 FAB 표시 — `Fab`이 단다. 토스트가 모바일에서 이 버튼 위로 올라간다(`Toast.css.ts`, I-h2 · GUI `958:20841`).
 * 판정은 `activeMarker(FAB_ATTR)`로 — 숨은 Activity(이동 전 화면)의 FAB는 빼고 본다(patterns §6).
 * CSS 파일(`.css.ts`)에서도 읽으므로 React를 import하지 않는다.
 */
export const FAB_ATTR = 'data-fab';

/** 그려 두었지만 지금 안 보이는 FAB(맨 위로 버튼 — 스크롤 전 `visibility: hidden`). 있으면 토스트를 올리지 않는다 */
export const FAB_HIDDEN_ATTR = 'data-fab-hidden';
