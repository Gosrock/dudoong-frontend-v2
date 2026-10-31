'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getKakaoLoginLink } from '@/api/auth/calls';
import { getErrorCode, getErrorStatus } from '@/api/errors';
import { log } from '@/utils/log';

import { browserLocation } from '../browser-location';
import type { AuthFailure } from './auth-outcome';
import { saveLoginRedirect } from './login-redirect';

export type KakaoLoginState =
  | { status: 'idle' }
  /** 링크를 받는 중이거나 카카오로 이동하는 중. 버튼을 막는다 */
  | { status: 'starting' }
  | { status: 'error'; failure: Extract<AuthFailure, 'failed'> };

/**
 * 로그인 화면(`/login`, `/login/expired`)의 [카카오 로그인]. UI와 무관하게 상태와 동작만 돌려준다.
 *
 * `start()`: 돌아올 곳을 보관(`sessionStorage`, `login-redirect.ts`) → 1 `GET /oauth/kakao/link`(쿠키 포함 — `oauth_state`
 * 쿠키를 받는다) → 받은 카카오 주소로 이동. 실패하면 `failed`(링크 발급은 `permitAll`이라 낡은 액세스 쿠키로 막히지 않는다 — #792).
 *
 * 카카오에서 뒤로 와 이 화면이 bfcache로 복원되면 `starting`에 멈춰 있지 않게 `idle`로 돌린다.
 *
 * @param redirect 로그인 뒤 돌아갈 곳(`?redirect=` 값 그대로). 검증은 보관할 때 한다
 */
export function useKakaoLogin(redirect: string | null | undefined) {
  const [state, setState] = useState<KakaoLoginState>({ status: 'idle' });
  const starting = useRef(false);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      starting.current = false;
      setState({ status: 'idle' });
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const start = useCallback(async () => {
    if (starting.current) return;
    starting.current = true;
    setState({ status: 'starting' });
    saveLoginRedirect(redirect);
    try {
      const link = await getKakaoLoginLink();
      if (!/^https?:\/\//.test(link)) throw new Error('kakao link is not an absolute URL');
      browserLocation.assign(link);
    } catch (e) {
      starting.current = false;
      log('warn', 'auth.kakao_link_failed', { status: getErrorStatus(e), code: getErrorCode(e) });
      setState({ status: 'error', failure: 'failed' });
    }
  }, [redirect]);

  return { state, start };
}
