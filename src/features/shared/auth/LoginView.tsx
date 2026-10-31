'use client';

import { useSearchParams } from 'next/navigation';

import { AUTH_FAILURE_MESSAGE } from './model/auth-outcome';
import { useKakaoLogin } from './model/useKakaoLogin';

/**
 * 로그인(`/login`)·세션 만료 안내(`/login/expired`) — 스타일 없는 최소 마크업(P4b-L). 화면(GUI `331:11720`)은 P4b-V.
 * 둘 다 `?redirect=`로 돌아올 곳을 받는다. 게이트는 `/login`, 세션 상실은 `/login/expired`로 보낸다.
 */
export function LoginView({ expired = false }: { expired?: boolean }) {
  const redirect = useSearchParams().get('redirect');
  const { state, start } = useKakaoLogin(redirect);
  return (
    <main>
      <h1>{expired ? '로그인이 만료됐어요' : '로그인'}</h1>
      <p>
        {expired ? '다시 로그인해 주세요.' : '두둥에 로그인하고 즐거운 공연 라이프를 즐겨보세요!'}
      </p>
      {state.status === 'error' && <p role="alert">{AUTH_FAILURE_MESSAGE[state.failure]}</p>}
      <button
        type="button"
        onClick={() => void start()}
        disabled={state.status === 'starting'}
        aria-busy={state.status === 'starting'}
      >
        카카오 로그인/회원가입
      </button>
    </main>
  );
}
