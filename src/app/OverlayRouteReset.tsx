'use client';

import { usePathname } from 'next/navigation';
import { overlay } from 'overlay-kit';
import { useEffect, useRef } from 'react';

/**
 * 경로가 바뀌면 열린 오버레이를 모두 내린다(patterns §6). children을 감싸지 않는 말단이고,
 * `usePathname`이 동적 경로에서 suspend하므로 providers.tsx가 자체 `<Suspense fallback={null}>`로 감싼다.
 * history는 건드리지 않는다 — 오버레이가 넣은 뒤로가기 항목(useCloseOnBack)은 이동 아래에 남는다.
 * 같은 경로의 쿼리만 바뀌는 것(`?tab=`, `?order=`)은 경로 변경이 아니다.
 */
export function OverlayRouteReset() {
  const pathname = usePathname();
  const prev = useRef(pathname);
  useEffect(() => {
    if (prev.current === pathname) return;
    prev.current = pathname;
    overlay.unmountAll();
  }, [pathname]);
  return null;
}
