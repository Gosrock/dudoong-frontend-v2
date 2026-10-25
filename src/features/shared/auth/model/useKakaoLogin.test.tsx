import { act, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authHandlers } from '@/api/__mocks__/auth.handlers';
import { EXPIRED_ACCESS_TOKEN, FORGED_ACCESS_TOKEN } from '@/api/__mocks__/respond';
import { server } from '@/api/__mocks__/server';
import { renderWithProviders } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { browserLocation } from '../browser-location';
import { LoginView } from '../LoginView';
import { readLoginRedirect } from './login-redirect';
import { useKakaoLogin } from './useKakaoLogin';

const search = { value: new URLSearchParams() };
vi.mock('next/navigation', () => ({ useSearchParams: () => search.value }));

let assign: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, '', '/login');
  assign = vi.spyOn(browserLocation, 'assign').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('로그인 화면 [카카오 로그인]', () => {
  it('누르면 돌아올 곳을 보관하고, 쿠키를 실어 링크를 받아 카카오 인증 화면으로 간다', async () => {
    const sent = recordRequests();
    const { result } = renderHook(() => useKakaoLogin('/gate-check?x=1'));

    await act(() => result.current.start());

    expect(readLoginRedirect()).toBe('/gate-check?x=1');
    expect(await sent.list()).toMatchObject([
      { method: 'GET', path: '/api/v1/auth/oauth/kakao/link', credentials: 'include' },
    ]);
    expect(assign).toHaveBeenCalledTimes(1);
    const link = new URL(String(assign.mock.calls[0]?.[0]));
    expect(link.pathname).toBe('/api/__mock/kakao/authorize');
    expect(link.searchParams.get('redirect_uri')).toMatch(/\/kakao\/callback$/);
    expect(link.searchParams.get('state')).toBeTruthy();
    // 이동하는 동안 버튼을 막는다
    expect(result.current.state).toEqual({ status: 'starting' });
  });

  it('외부 주소(오픈 리다이렉트)를 받으면 / 를 보관한다', async () => {
    const { result } = renderHook(() => useKakaoLogin('https://evil.example'));
    await act(() => result.current.start());
    expect(readLoginRedirect()).toBe('/');
  });

  it('두 번 눌러도 링크 요청은 한 번', async () => {
    const sent = recordRequests();
    const { result } = renderHook(() => useKakaoLogin(null));
    await act(() => Promise.all([result.current.start(), result.current.start()]));
    expect(await sent.lines()).toEqual(['GET /api/v1/auth/oauth/kakao/link']);
  });

  it.each([EXPIRED_ACCESS_TOKEN, FORGED_ACCESS_TOKEN])(
    '액세스 쿠키(%s)가 남아 있어도 링크 발급은 익명으로 통과해 카카오로 간다(#792)',
    async (token) => {
      document.cookie = `accessToken=${token}; path=/`;
      try {
        const { result } = renderHook(() => useKakaoLogin(null));
        await act(() => result.current.start());
        expect(result.current.state).toEqual({ status: 'starting' });
        expect(assign).toHaveBeenCalledTimes(1);
      } finally {
        document.cookie = 'accessToken=; path=/; max-age=0';
      }
    },
  );

  it('링크 발급이 5xx면 일반 실패이고 다시 누를 수 있다', async () => {
    server.use(...authHandlers.kakaoLinkServerError);
    const { result } = renderHook(() => useKakaoLogin(null));
    await act(() => result.current.start());
    expect(result.current.state).toEqual({ status: 'error', failure: 'failed' });

    server.resetHandlers();
    await act(() => result.current.start());
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it('카카오에서 뒤로 와 bfcache로 복원되면 다시 누를 수 있게 idle로 돌아온다', async () => {
    const { result } = renderHook(() => useKakaoLogin(null));
    await act(() => result.current.start());
    expect(result.current.state.status).toBe('starting');
    act(() => {
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });
    expect(result.current.state).toEqual({ status: 'idle' });
  });
});

describe('로그인 화면 마크업(훅 상태를 그대로 보여 준다)', () => {
  it('?redirect= 를 보관하고, 링크 발급이 실패하면 안내 문구가 보인다', async () => {
    search.value = new URLSearchParams('redirect=%2Ftickets');
    server.use(...authHandlers.kakaoLinkServerError);
    const { user } = renderWithProviders(<LoginView />);
    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '카카오 로그인/회원가입' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        '로그인하지 못했어요. 다시 시도해 주세요.',
      ),
    );
    expect(readLoginRedirect()).toBe('/tickets');
  });

  it('만료 안내(/login/expired)는 제목만 다르고 같은 동작', () => {
    search.value = new URLSearchParams();
    renderWithProviders(<LoginView expired />);
    expect(screen.getByRole('heading', { name: '로그인이 만료됐어요' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '카카오 로그인/회원가입' })).toBeEnabled();
  });
});
