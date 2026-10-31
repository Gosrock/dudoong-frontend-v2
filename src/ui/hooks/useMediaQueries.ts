'use client';

import { useEffect, useState } from 'react';

import { breakpoints } from '../theme/breakpoints';

export type Viewport = 'mobile' | 'desktop';

/**
 * 컴포넌트 자체를 바꿔야 할 때만 쓴다(patterns §1-4). 보이기·숨기기·간격은 sprinkles 조건부 값으로 한다.
 * 첫 렌더는 서버와 같게 `null`이고, 마운트 뒤에 판정한다 — `null`일 때는 양쪽 공통 자리표시를 그린다.
 */
export function useMediaQueries(): Viewport | null {
  const [current, setCurrent] = useState<Viewport | null>(null);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoints.desktop}px)`);
    const update = () => setCurrent(mq.matches ? 'desktop' : 'mobile');
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return current;
}
