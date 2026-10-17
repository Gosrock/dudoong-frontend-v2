'use client';

import { useEffect, useRef } from 'react';

/** 닫힘 애니메이션 길이(ms). 오버레이 css의 애니메이션보다 조금 길게 잡는다 */
export const OVERLAY_EXIT_MS = 300;

/**
 * `open`이 true → false로 바뀐 뒤 닫힘 애니메이션이 끝날 즈음 `onExited`를 부른다.
 * overlay-kit의 `unmount`를 여기에 넘긴다. animationend에 기대지 않는다 — prefers-reduced-motion에서는
 * 애니메이션이 없어 이벤트가 오지 않고, vaul은 바깥에서 open을 바꾸면 onAnimationEnd를 부르지 않는다.
 */
export function useOnExited(
  open: boolean,
  onExited: (() => void) | undefined,
  ms = OVERLAY_EXIT_MS,
) {
  const wasOpen = useRef(open);
  const cb = useRef(onExited);
  useEffect(() => {
    cb.current = onExited;
  });
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      return;
    }
    if (!wasOpen.current) return;
    const t = setTimeout(() => {
      wasOpen.current = false;
      cb.current?.();
    }, ms);
    return () => clearTimeout(t);
  }, [open, ms]);
}
