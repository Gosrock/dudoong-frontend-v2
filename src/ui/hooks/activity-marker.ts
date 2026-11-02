/**
 * 숨은 Activity 표시. Next 16(Cache Components)은 이동할 때 이전 페이지를 지우지 않고 React `<Activity>`로
 * `display: none` 숨겨 DOM에 남긴다(`node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`).
 * 그래서 셸의 `:has([표시])`·`querySelector('[표시]')`가 숨은 페이지에도 맞는다(patterns §6).
 *
 * 표시를 단 요소가 숨겨지면(effect 정리) 이 속성을 붙이고, 다시 보이면 뗀다(`useActivityMarker`).
 * 판정은 `[표시]:not([data-activity-hidden])`로 — 서버 HTML(첫 화면)에는 이 속성이 없어 지금처럼 맞는다.
 * CSS 파일(`.css.ts`)에서도 읽으므로 React를 import하지 않는다.
 */
export const ACTIVITY_HIDDEN_ATTR = 'data-activity-hidden';

/** `[표시]`가 지금 보이는 화면의 것일 때만 맞는 선택자 */
export const activeMarker = (attr: string) => `[${attr}]:not([${ACTIVITY_HIDDEN_ATTR}])`;
