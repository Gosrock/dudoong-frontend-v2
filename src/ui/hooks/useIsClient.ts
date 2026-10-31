'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * 마운트(하이드레이션) 뒤에만 `true`(patterns §9 표 "마운트 뒤에만 실행"). 서버 렌더·프리렌더와 하이드레이션 첫 렌더는 `false`라
 * 서버와 같은 DOM을 그린다. 지금 시각(`new Date()`)·브라우저 저장소처럼 프리렌더에서 읽으면 안 되는 값을 쓰는 부분을 이 뒤에 둔다
 * (P9c-V — 셸 공지 배너가 프리렌더 중 `new Date()`를 부르면 Cache Components가 막는다).
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
