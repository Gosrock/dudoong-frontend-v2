'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useCloseOnBack } from '@/ui/hooks/useCloseOnBack';

/**
 * [전체화면 전환](와이어 `108:4656`·`108:4693`) — 화면 안 전체화면(고정 층)을 열고, 되면 브라우저 전체화면도 요청한다.
 * 같은 요소를 고정 층으로 바꿔 카메라를 다시 켜지 않는다. 뒤로가기·[‹]·Esc(브라우저 전체화면을 빠져나옴)로 닫는다(patterns §6).
 */
export function useStageFullscreen() {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const native = useRef(false);

  const exitNative = () => {
    if (native.current && document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    native.current = false;
  };

  const close = useCallback(() => {
    exitNative();
    setOpen(false);
  }, []);

  const enter = useCallback(() => {
    setOpen(true);
    const el = ref.current;
    // 사용자 동작 안에서만 요청할 수 있다. iPhone Safari처럼 안 되는 곳은 화면 안 전체화면만
    if (el?.requestFullscreen && document.fullscreenEnabled) {
      el.requestFullscreen()
        .then(() => {
          native.current = true;
        })
        .catch(() => {});
    }
  }, []);

  // 브라우저 전체화면을 Esc 등으로 빠져나오면 화면 안 전체화면도 닫는다
  useEffect(() => {
    if (!open) return;
    const onChange = () => {
      if (native.current && !document.fullscreenElement) {
        native.current = false;
        setOpen(false);
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [open]);

  useEffect(() => () => exitNative(), []);

  useCloseOnBack(open, close);

  return { ref: ref as React.RefObject<never>, open, enter, close };
}
