'use client';

import { useRouter } from 'next/navigation';
import { type AnchorHTMLAttributes, useCallback, useSyncExternalStore } from 'react';

import { browserLocation } from './browser-location';
import { loginHref } from './login-href';
import { useSession } from './useSession';

const noopSubscribe = () => () => {};
/** 지금 주소로 돌아오는 로그인 주소. 서버·하이드레이션 때는 `/login`(주소를 읽지 않는다) */
const useLoginHref = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => loginHref(browserLocation.currentPath()),
    () => '/login',
  );

/**
 * 익명이 확정된 사용자의 사용자별 버튼(♡ 관심, 선물 수락 등) 자리에 둔다(patterns §4-2).
 * 요청을 보내지 않고 `/login?redirect=<현재 주소>`로 간다. 누를 때 주소를 다시 읽어 클라이언트 이동 뒤에도 맞다.
 */
export function LoginRequiredLink({
  children,
  onClick,
  ...rest
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const router = useRouter();
  const href = useLoginHref();
  return (
    <a
      {...rest}
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        router.push(loginHref(browserLocation.currentPath()));
      }}
    >
      {children}
    </a>
  );
}

/**
 * 사용자별 동작을 감싼다. 세션이면 `action`을 실행하고, 익명이 확정됐으면 요청 없이 로그인으로 간다.
 * `ready`가 false(세션 확인 중·확인 실패)인 동안 버튼은 비활성 자리표시로 둔다.
 */
export function useRequireLogin() {
  const session = useSession();
  const router = useRouter();
  const status = session.status;
  const requireLogin = useCallback(
    (action: () => void) => {
      if (status === 'session') action();
      else if (status === 'anonymous') router.push(loginHref(browserLocation.currentPath()));
    },
    [status, router],
  );
  return { ready: status === 'session' || status === 'anonymous', session, requireLogin };
}
