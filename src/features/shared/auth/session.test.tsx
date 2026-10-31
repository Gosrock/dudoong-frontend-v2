import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import { act, renderHook, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { authHandlers } from '@/api/__mocks__/auth.handlers';
import { me } from '@/api/__mocks__/fixtures/me';
import { meHandlers } from '@/api/__mocks__/me.handlers';
import { errors, ok } from '@/api/__mocks__/respond';
import { server } from '@/api/__mocks__/server';
import { setAuthHandlers } from '@/api/auth-handlers';
import { SessionLostError } from '@/api/errors';
import { api } from '@/api/http';
import { meQuery } from '@/api/me/queries';
import { getQueryClient, setErrorNotifier } from '@/api/query-client';
import {
  knownSessionFlag,
  readSessionFlag,
  resetSessionFlagStateForTest,
  SESSION_KEY,
  startSession,
} from '@/api/session-flag';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import { browserLocation } from './browser-location';
import { LoginRequiredLink, useRequireLogin } from './LoginRequiredLink';
import { useProtectedArea } from './protected-area';
import { registerAuth } from './register-auth';
import { handleSessionLost } from './session-lost';
import { useLogout } from './useLogout';

const router = { replace: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

let assign: ReturnType<typeof vi.spyOn>;
let reload: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  localStorage.clear();
  resetSessionFlagStateForTest();
  window.history.replaceState(null, '', '/events/3?x=1');
  assign = vi.spyOn(browserLocation, 'assign').mockImplementation(() => {});
  reload = vi.spyOn(browserLocation, 'reload').mockImplementation(() => {});
});
afterEach(() => {
  setAuthHandlers(null);
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

/** 보호 영역 흉내 — 게이트가 하는 등록만 */
function ProtectedArea() {
  useProtectedArea();
  return null;
}

/** 다른 탭이 dd:session을 바꾼 것처럼 storage 이벤트를 보낸다(같은 탭의 쓰기에는 이벤트가 없다) */
function otherTabWrites(newValue: string | null) {
  const oldValue = localStorage.getItem(SESSION_KEY);
  if (newValue === null) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, newValue);
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: SESSION_KEY,
      oldValue,
      newValue,
      storageArea: localStorage,
    }),
  );
}

describe('세션 상실(onSessionLost)', () => {
  it('공개 화면이면 캐시를 비우고 표시를 지운 뒤 같은 주소를 새로고침', () => {
    startSession();
    const qc = createTestQueryClient();
    qc.setQueryData(['me'], me);
    handleSessionLost(qc);
    expect(qc.getQueryData(['me'])).toBeUndefined();
    expect(readSessionFlag()).toBeNull();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(assign).not.toHaveBeenCalled();
  });

  it('보호 영역이면 /login/expired?redirect=현재주소', () => {
    startSession();
    const qc = createTestQueryClient();
    const view = renderWithProviders(<ProtectedArea />, { queryClient: qc });
    handleSessionLost(qc);
    expect(assign).toHaveBeenCalledWith('/login/expired?redirect=%2Fevents%2F3%3Fx%3D1');
    expect(reload).not.toHaveBeenCalled();
    view.unmount();
  });

  it('토스트를 띄우지 않는다 — 배경 재조회와 변경이 SessionLostError로 끝나도', async () => {
    startSession();
    const notify = vi.fn();
    setErrorNotifier(notify);
    const qc = getQueryClient();
    const cleanup = registerAuth(qc);
    server.use(
      http.get('*/api/v2/probe', ({ request }) => errors.noToken(request)),
      http.post('*/api/v2/probe', ({ request }) => errors.noToken(request)),
      ...authHandlers.refreshRejected,
    );
    const Probe = z.object({ ok: z.boolean() });
    qc.setQueryData(['probe'], { ok: true });
    await qc
      .fetchQuery({ queryKey: ['probe'], queryFn: () => api.get('probe', Probe), staleTime: 0 })
      .catch(() => {});
    await qc
      .getMutationCache()
      .build(qc, { mutationFn: () => api.post('probe', Probe) })
      .execute(undefined)
      .catch((e: unknown) => expect(e).toBeInstanceOf(SessionLostError));
    expect(notify).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledTimes(1);
    cleanup();
    setErrorNotifier(null);
    qc.clear();
  });
});

describe('다른 탭(storage 이벤트)', () => {
  let qc: QueryClient;
  let cleanup: () => void;
  beforeEach(() => {
    startSession();
    resetSessionFlagStateForTest();
    qc = createTestQueryClient();
    qc.setQueryData(['me'], me);
    cleanup = registerAuth(qc);
  });
  afterEach(() => cleanup());

  it('로그아웃(표시가 사라짐) → 캐시를 비우고 공개 화면은 새로고침', () => {
    otherTabWrites(null);
    expect(qc.getQueryData(['me'])).toBeUndefined();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('보호 영역이면 /login?redirect=현재주소 로 하드 이동', () => {
    const view = renderWithProviders(<ProtectedArea />, { queryClient: qc });
    otherTabWrites(null);
    expect(assign).toHaveBeenCalledWith('/login?redirect=%2Fevents%2F3%3Fx%3D1');
    expect(qc.getQueryData(['me'])).toBeUndefined();
    view.unmount();
  });

  it('다른 값(계정 전환) → 같은 처리', () => {
    otherTabWrites('another-session');
    expect(qc.getQueryData(['me'])).toBeUndefined();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('같은 값·다른 키는 무시한다', () => {
    otherTabWrites(knownSessionFlag());
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'other', newValue: 'x', storageArea: localStorage }),
    );
    expect(reload).not.toHaveBeenCalled();
    expect(qc.getQueryData(['me'])).toEqual(me);
  });

  it('없던 값이 생겼고 이 탭이 이미 세션이면 값만 받아들인다', () => {
    cleanup();
    localStorage.clear();
    resetSessionFlagStateForTest();
    cleanup = registerAuth(qc);
    otherTabWrites('from-other-tab');
    expect(reload).not.toHaveBeenCalled();
    expect(knownSessionFlag()).toBe('from-other-tab');
  });

  it('없던 값이 생겼고 이 탭이 익명이면 새로고침(로그인 상태로 다시 그린다)', () => {
    cleanup();
    localStorage.clear();
    resetSessionFlagStateForTest();
    qc.setQueryData(['me'], null);
    cleanup = registerAuth(qc);
    otherTabWrites('from-other-tab');
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('bfcache 복원(pageshow)', () => {
  function pageshow(persisted: boolean) {
    const e = new Event('pageshow');
    Object.defineProperty(e, 'persisted', { value: persisted });
    window.dispatchEvent(e);
  }

  it('복원됐고 표시 값이 로드 때와 다르면 새로고침, 같거나 복원이 아니면 그대로', () => {
    startSession();
    const cleanup = registerAuth(createTestQueryClient());
    pageshow(true);
    expect(reload).not.toHaveBeenCalled();
    localStorage.setItem(SESSION_KEY, 'b-user');
    pageshow(false);
    expect(reload).not.toHaveBeenCalled();
    pageshow(true);
    expect(reload).toHaveBeenCalledTimes(1);
    cleanup();
  });
});

describe('익명이 확정된 사용자별 버튼', () => {
  it('LoginRequiredLink — 요청 없이 /login?redirect=현재주소 로 간다', async () => {
    const requests: string[] = [];
    const onStart = ({ request }: { request: Request }) => requests.push(request.url);
    server.events.on('request:start', onStart);
    const { user } = renderWithProviders(<LoginRequiredLink>♡ 관심</LoginRequiredLink>);
    const link = screen.getByRole('link', { name: '♡ 관심' });
    expect(link).toHaveAttribute('href', '/login?redirect=%2Fevents%2F3%3Fx%3D1');
    await user.click(link);
    expect(router.push).toHaveBeenCalledWith('/login?redirect=%2Fevents%2F3%3Fx%3D1');
    expect(requests).toEqual([]);
    server.events.removeListener('request:start', onStart);
  });

  it('useRequireLogin — 익명이면 동작(보호 API) 대신 로그인으로, 세션이 확정되기 전에는 아무것도 하지 않는다', async () => {
    server.use(...meHandlers.anonymous);
    const action = vi.fn();
    const qc = createTestQueryClient();
    const { result } = renderHook(() => useRequireLogin(), {
      wrapper: ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>,
    });
    expect(result.current.ready).toBe(false);
    act(() => result.current.requireLogin(action));
    expect(router.push).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.requireLogin(action));
    expect(action).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith('/login?redirect=%2Fevents%2F3%3Fx%3D1');
  });

  it('useRequireLogin — 세션이면 동작을 실행한다', async () => {
    startSession();
    server.use(...meHandlers.loggedIn);
    const action = vi.fn();
    const qc = createTestQueryClient();
    const { result } = renderHook(() => useRequireLogin(), {
      wrapper: ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>,
    });
    await waitFor(() => expect(result.current.session.status).toBe('session'));
    act(() => result.current.requireLogin(action));
    expect(action).toHaveBeenCalledTimes(1);
  });
});

describe('로그아웃', () => {
  it.each([
    ['200', authHandlers.byCookie],
    ['502(HTML)', authHandlers.logoutServerError],
  ])(
    '응답이 %s여도 캐시·표시를 지우고 / 로 하드 이동 — 이전 사용자의 캐시가 남지 않는다',
    async (_, handlers) => {
      startSession();
      server.use(...handlers);
      const qc = createTestQueryClient();
      qc.setQueryData(meQuery().queryKey, me);
      qc.setQueryData(['orders'], [{ id: 1 }]);
      const { result } = renderHook(() => useLogout(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={qc}>{children}</QueryClientProvider>
        ),
      });
      expect(result.current.disabled).toBe(false);
      await act(() => result.current.logout());
      expect(qc.getQueryCache().getAll()).toHaveLength(0);
      expect(readSessionFlag()).toBeNull();
      expect(assign).toHaveBeenCalledWith('/');
    },
  );

  it('진행 중인 변경이 있으면 disabled', async () => {
    const qc = createTestQueryClient();
    let release: () => void = () => {};
    const { result } = renderHook(
      () => ({
        logout: useLogout(),
        mutation: useMutation({
          mutationFn: () => new Promise<void>((r) => (release = r)),
        }),
      }),
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={qc}>{children}</QueryClientProvider>
        ),
      },
    );
    act(() => result.current.mutation.mutate());
    await waitFor(() => expect(result.current.logout.disabled).toBe(true));
    act(() => release());
    await waitFor(() => expect(result.current.logout.disabled).toBe(false));
  });
});

describe('GM-1 결과 셋', () => {
  it('세션 — 표시가 없으면 세운다', async () => {
    server.use(...meHandlers.loggedIn);
    const value = await createTestQueryClient().fetchQuery(meQuery());
    expect(value).toEqual(me);
    expect(readSessionFlag()).not.toBeNull();
  });

  it('null — 표시 없는 401(재발급하지 않는다)', async () => {
    const refresh = vi.fn();
    setAuthHandlers({ refresh, onSessionLost: vi.fn() });
    server.use(...meHandlers.expired);
    await expect(createTestQueryClient().fetchQuery(meQuery())).resolves.toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('null — 재발급이 세션 상실', async () => {
    startSession();
    setAuthHandlers({
      refresh: () => api.get('never', z.unknown()),
      onSessionLost: vi.fn(),
    });
    server.use(
      ...meHandlers.expired,
      http.get('*/api/v2/never', ({ request }) => errors.refreshRejected(request)),
    );
    await expect(createTestQueryClient().fetchQuery(meQuery())).resolves.toBeNull();
  });

  it('throw — GM-1 5xx, 재발급 일시 오류', async () => {
    server.use(http.get('*/api/v2/me', ({ request }) => errors.serverError(request)));
    await expect(createTestQueryClient().fetchQuery(meQuery())).rejects.toMatchObject({
      status: 500,
    });
    startSession();
    setAuthHandlers({
      refresh: () => api.get('never', z.unknown()),
      onSessionLost: vi.fn(),
    });
    server.use(
      ...meHandlers.expired,
      http.get('*/api/v2/never', ({ request }) => errors.serverError(request)),
    );
    await expect(createTestQueryClient().fetchQuery(meQuery())).rejects.toMatchObject({
      status: 500,
    });
    expect(readSessionFlag()).not.toBeNull();
  });

  it('공개 GET 성공은 표시를 세우지 않는다(세우는 곳은 GM-1과 로그인뿐)', async () => {
    server.use(http.get('*/api/v2/pub', () => ok({ ok: true })));
    await api.get('pub', z.object({ ok: z.boolean() }), { public: true });
    expect(readSessionFlag()).toBeNull();
  });
});
