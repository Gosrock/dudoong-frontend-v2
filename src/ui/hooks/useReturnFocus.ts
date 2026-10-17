'use client';

import { useRef } from 'react';

/**
 * Radix Dialog는 `Dialog.Trigger` 없이 열면(overlay-kit처럼 코드로 열 때) 닫힌 뒤 포커스를 돌려줄 곳이 없어 body로 간다.
 * 열릴 때 포커스가 있던 요소를 기억했다가 닫힐 때 그리로 돌려준다. Content의 두 핸들러에 그대로 넘긴다.
 * (onOpenAutoFocus는 Radix가 포커스를 옮기기 직전에 불리므로 그때의 activeElement가 여는 버튼이다)
 */
export function useReturnFocus(options: { autoFocus?: boolean } = {}) {
  const { autoFocus = true } = options;
  const returnTo = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: (e: Event) => {
      returnTo.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (!autoFocus) e.preventDefault();
    },
    onCloseAutoFocus: (e: Event) => {
      const el = returnTo.current;
      if (el && el.isConnected) {
        e.preventDefault();
        el.focus();
      }
    },
  };
}
