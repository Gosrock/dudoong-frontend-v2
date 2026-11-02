/**
 * 공연 스코프 표시 — `EventScopeFrame`이 단다. 있으면 호스팅 셸이 본문의 폭 제한·여백을 푼다(3단은 화면 끝까지).
 * 판정은 `activeMarker`로 — 숨은 Activity(이동 전 공연 화면)의 표시는 빼고 본다(fix-qa-1101, patterns §6)
 */
export const EVENT_SCOPE_ATTR = 'data-event-scope';

/**
 * 공연 헤더 숨김 — 모바일에서 공연 헤더("티켓 관리 ▾") 대신 ← 제목 헤더를 쓰는 화면(티켓 폼, GUI `767:46671`)이
 * 보이는 동안만 공연 스코프 틀에 건다. `:has()`로 하면 Cache Components가 숨겨 둔 이전 화면(React Activity)에도 맞아
 * 목록으로 돌아와도 헤더가 숨는다. 숨기는 스타일은 공연 헤더 쪽(`EventScopeNav.css.ts`)
 */
export const HIDE_EVENT_HEADER_ATTR = 'data-hide-event-header';
