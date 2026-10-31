import { useEffect } from 'react';

/**
 * 지금 보호 영역(`(protected)`·`/hosting`) 안에 있는지. 경로 목록으로 판정하지 않고(tech-decisions §3 — 폴더로 나눈다)
 * 그 영역의 레이아웃이 그리는 로그인 게이트가 마운트돼 있는지로 본다.
 * `onSessionLost`·`storage` 이벤트처럼 React 밖에서 이동할 곳을 정할 때 읽는다.
 */
let mounted = 0;

export const isInProtectedArea = () => mounted > 0;

/** 로그인 게이트가 부른다 */
export function useProtectedArea() {
  useEffect(() => {
    mounted += 1;
    return () => {
      mounted -= 1;
    };
  }, []);
}
