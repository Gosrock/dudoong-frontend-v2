'use client';

import { useEffect, useState } from 'react';

import {
  checkCanRegister,
  exchangeKakaoCode,
  getKakaoProfile,
  loginWithKakao,
} from '@/api/auth/calls';
import { getErrorCode, getErrorStatus } from '@/api/errors';
import { log } from '@/utils/log';

import { browserLocation } from '../browser-location';
import { loginHref } from '../login-href';
import { type AuthFailure, classifyAuthFailure, readCallbackParams } from './auth-outcome';
import { finishLogin } from './finish-login';
import { readLoginRedirect } from './login-redirect';
import { type RegisterForm, type RegisterInput, useRegisterForm } from './useRegisterForm';

/** 콜백 처리 결과. 기존 사용자는 로그인까지 끝났고, 신규 사용자는 가입 폼이 필요하다 */
export type CallbackResult = { kind: 'loggedIn' } | ({ kind: 'register' } & RegisterInput);

/**
 * 콜백 3~5번(api-contract §9 카카오 로그인 흐름).
 * 3 코드 교환(`state` 전달, 쿠키 포함) → 4 신규 판정 → 기존이면 5a 로그인(두둥 쿠키 세팅), 신규면 5b 카카오 프로필.
 * 카카오 토큰은 이 흐름 동안 메모리에만 있다(저장하지 않는다).
 */
export async function runKakaoCallback(
  code: string,
  state: string | null,
): Promise<CallbackResult> {
  const tokens = await exchangeKakaoCode({ code, state });
  if (!tokens.idToken) throw new Error('kakao id token missing');
  if (!(await checkCanRegister(tokens.idToken))) {
    await loginWithKakao(tokens.idToken);
    return { kind: 'loggedIn' };
  }
  if (!tokens.accessToken) throw new Error('kakao access token missing');
  const profile = await getKakaoProfile(tokens.accessToken);
  return { kind: 'register', idToken: tokens.idToken, profile };
}

/**
 * 인가 코드 하나는 한 번만 교환한다. 개발 모드 StrictMode의 effect 두 번 실행, 같은 화면의 다시 마운트가
 * 같은 코드를 다시 보내면 카카오가 `KOE320`(코드 재사용)으로 거절한다 — 진행 중이거나 끝난 결과에 합류한다.
 */
let lastRun: { code: string; result: Promise<CallbackResult> } | null = null;
function runOnce(code: string, state: string | null) {
  if (lastRun?.code !== code) lastRun = { code, result: runKakaoCallback(code, state) };
  return lastRun.result;
}

/** 테스트 전용 */
export function resetKakaoCallbackForTest() {
  lastRun = null;
}

type Phase =
  | { status: 'pending' }
  | { status: 'register'; input: RegisterInput }
  /** 로그인 성공 — 돌아올 곳으로 이동 중 */
  | { status: 'redirecting' }
  /** 로그인 화면으로 돌아가는 중(`state` 불일치, 카카오 동의 취소, 코드 없음) */
  | { status: 'restarting' }
  | {
      status: 'error';
      failure: Exclude<AuthFailure, 'restart'>;
      /** "다시 로그인" 주소 — 돌아올 곳을 유지한다 */
      loginHref: string;
    };

export type KakaoCallbackState =
  Exclude<Phase, { status: 'register' }> | { status: 'register'; form: RegisterForm };

/**
 * `/kakao/callback` 화면 상태. UI와 무관하게 상태만 돌려준다.
 * - `pending` → 성공이면 `redirecting`(세션 표시를 새로 세우고 돌아올 곳으로 하드 이동 — `finishLogin`)
 * - 신규 사용자면 `register` + 가입 폼(`useRegisterForm`)
 * - 실패: `USER_403_1` → `error/suspended`, 401 → `error/retryLater`, 그 밖 → `error/failed`,
 *   `AUTH_400_1`·동의 취소·코드 없음 → `restarting`(로그인 화면으로 replace, 돌아올 곳 유지)
 *
 * @param search 콜백 주소의 쿼리(`useSearchParams()` 또는 `location.search`)
 */
export function useKakaoCallback(search: URLSearchParams | string): KakaoCallbackState {
  const query = typeof search === 'string' ? search : search.toString();
  const [phase, setPhase] = useState<Phase>({ status: 'pending' });

  useEffect(() => {
    let active = true;
    const restart = () => {
      setPhase({ status: 'restarting' });
      browserLocation.replace(loginHref(readLoginRedirect()));
    };
    const params = readCallbackParams(new URLSearchParams(query));
    if (params.kind !== 'code') {
      log('info', 'auth.kakao_callback_without_code', { kind: params.kind });
      restart();
      return;
    }
    runOnce(params.code, params.state).then(
      (result) => {
        if (!active) return;
        if (result.kind === 'register') {
          setPhase({
            status: 'register',
            input: { idToken: result.idToken, profile: result.profile },
          });
          return;
        }
        setPhase({ status: 'redirecting' });
        finishLogin();
      },
      (e: unknown) => {
        if (!active) return;
        const failure = classifyAuthFailure(e);
        log('warn', 'auth.kakao_callback_failed', {
          failure,
          status: getErrorStatus(e),
          code: getErrorCode(e),
        });
        if (failure === 'restart') restart();
        else setPhase({ status: 'error', failure, loginHref: loginHref(readLoginRedirect()) });
      },
    );
    return () => {
      active = false;
    };
  }, [query]);

  const form = useRegisterForm(phase.status === 'register' ? phase.input : null);
  if (phase.status === 'register') return { status: 'register', form };
  return phase;
}
