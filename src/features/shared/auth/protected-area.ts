import { useEffect } from 'react';

/**
 * 지금 보호 영역(`(protected)`·`/hosting`) 안에 있는지. 경로 목록으로 판정하지 않고(tech-decisions §3 — 폴더로 나눈다)
 * 그 영역의 레이아웃이 그리는 로그인 게이트가 마운트돼 있는지로 본다.
 * `onSessionLost`·`storage` 이벤트처럼 React 밖에서 이동할 곳을 정할 때 읽는다.
 */
let mounted = 0;

/** 게이트 스켈레톤이 다는 표시 — 서버 HTML에도 있다 */
export const PROTECTED_AREA_ATTR = 'data-protected-area';

/**
 * 게이트가 마운트됐거나, 아직 하이드레이션 전이라 서버가 그린 게이트 스켈레톤만 있으면 보호 영역이다.
 * 셸(P4s-V)이 게이트보다 먼저 하이드레이션돼 GM-1을 보내므로, 그 응답이 세션 상실이면 게이트 effect보다 먼저 여기를 읽는다
 */
export const isInProtectedArea = () =>
  mounted > 0 ||
  (typeof document !== 'undefined' && document.querySelector(`[${PROTECTED_AREA_ATTR}]`) !== null);

/** 로그인 게이트가 부른다 */
export function useProtectedArea() {
  useEffect(() => {
    mounted += 1;
    return () => {
      mounted -= 1;
    };
  }, []);
}
