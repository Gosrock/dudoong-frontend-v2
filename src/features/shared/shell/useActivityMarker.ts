'use client';

import { useLayoutEffect, useRef } from 'react';

import { ACTIVITY_HIDDEN_ATTR } from './activity-marker';

/**
 * 셸이 `:has`·`querySelector`로 읽는 표시를 단 요소에 ref로 건다. 숨은 Activity가 되면(layout effect 정리 — 숨기기 직전에
 * 동기로 돈다) `data-activity-hidden`을 붙여 판정에서 빠지고, 다시 보이면 뗀다. 표시 속성 자체는 JSX가 그대로 그린다
 * (서버 HTML에도 있어야 새로고침 첫 화면이 맞는다). 속성을 지우지 않고 따로 붙이는 까닭은 `closest('[표시]')`로
 * 틀을 찾는 자식이 있기 때문(`TicketFormView` — 다시 보일 때 자식 effect가 부모보다 먼저 돈다).
 */
export function useActivityMarker<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.removeAttribute(ACTIVITY_HIDDEN_ATTR);
    return () => el.setAttribute(ACTIVITY_HIDDEN_ATTR, '');
  }, []);
  return ref;
}
