'use client';

import { useEffect, useRef } from 'react';

let seq = 0;

type Options = {
  /** false면 아무것도 하지 않는다. 바깥 컴포넌트(ResponsiveOverlay·EasyOverlay)가 대신 맡을 때 끈다 */
  enabled?: boolean;
  /**
   * true인 동안 뒤로가기를 받아도 닫지 않는다 — 소비된 항목을 다시 넣는다(EasyOverlay의 onConfirm 진행 중).
   */
  hold?: boolean;
};

const readMark = (): unknown => (window.history.state as { ddOverlay?: unknown } | null)?.ddOverlay;

function pushMark(id: string) {
  // Next App Router는 history.state의 __NA·__PRIVATE_NEXTJS_INTERNALS_TREE로 항목을 복원한다.
  // 기존 state를 펼쳐 그대로 두고 표시만 더한다. URL은 바꾸지 않는다(같은 경로라 OverlayRouteReset도 돌지 않는다).
  window.history.pushState({ ...window.history.state, ddOverlay: id }, '', window.location.href);
}

/**
 * 오버레이가 열린 채 뒤로가기를 누르면 오버레이만 닫는다(P2 결정).
 *
 * - 열릴 때 같은 URL로 history 항목 하나(`ddOverlay: <id>`)를 더한다.
 * - 뒤로가기(`popstate`)로 내 항목이 빠지면 `onClose()`.
 * - UI(버튼·Esc·바깥 클릭·스와이프)로 닫혀 `open`이 false가 되면, 내 항목이 맨 위일 때만 `history.back()`으로 소비한다.
 *   이때는 이미 닫힌 상태라 popstate에서 다시 닫지 않는다.
 * - 여러 겹이면 각자 id가 있어 맨 위 것만 닫힌다.
 * - 경로 이동으로 언마운트될 때(OverlayRouteReset의 unmountAll)는 history를 건드리지 않는다.
 *
 * 반환값 `release()`는 내 항목을 소비하고 popstate가 끝날 때까지 기다린다. 닫은 직후 화면 이동이 이어지는 곳
 * (EasyOverlay의 성공 처리)에서 `history.back()`과 이동이 엇갈리지 않게 쓴다.
 */
export function useCloseOnBack(open: boolean, onClose: () => void, options: Options = {}) {
  const { enabled = true, hold = false } = options;
  const idRef = useRef<string | null>(null);
  const pushedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const holdRef = useRef(hold);
  useEffect(() => {
    onCloseRef.current = onClose;
    holdRef.current = hold;
  });

  useEffect(() => {
    if (!enabled) return;
    if (!open) {
      if (pushedRef.current) {
        pushedRef.current = false;
        if (readMark() === idRef.current) window.history.back();
      }
      return;
    }
    idRef.current ??= `dd-overlay-${++seq}`;
    const id = idRef.current;
    // StrictMode의 effect 재실행에서 두 번 넣지 않는다
    if (readMark() !== id) pushMark(id);
    pushedRef.current = true;

    const onPopState = () => {
      if (!pushedRef.current || readMark() === id) return;
      if (holdRef.current) {
        pushMark(id);
        return;
      }
      pushedRef.current = false;
      onCloseRef.current();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [open, enabled]);

  /** 내 항목이 맨 위면 소비하고 popstate까지 기다린다. 아니면 바로 끝난다 */
  const release = (): Promise<void> => {
    if (!pushedRef.current || readMark() !== idRef.current) {
      pushedRef.current = false;
      return Promise.resolve();
    }
    pushedRef.current = false;
    return new Promise((resolve) => {
      const done = () => {
        window.removeEventListener('popstate', done);
        clearTimeout(timer);
        resolve();
      };
      // popstate가 오지 않는 환경(이미 다른 문서로 넘어감 등)에서 멈추지 않게
      const timer = setTimeout(done, 1000);
      window.addEventListener('popstate', done);
      window.history.back();
    });
  };

  return { release };
}
