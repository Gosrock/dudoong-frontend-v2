import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { http } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authHandlers } from '@/api/__mocks__/auth.handlers';
import { me } from '@/api/__mocks__/fixtures/me';
import { meHandlers } from '@/api/__mocks__/me.handlers';
import { errors, ok } from '@/api/__mocks__/respond';
import { server } from '@/api/__mocks__/server';
import { setAuthHandlers } from '@/api/auth-handlers';
import { meQuery } from '@/api/me/queries';
import { readSessionFlag, resetSessionFlagStateForTest, startSession } from '@/api/session-flag';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { browserLocation } from './browser-location';
import { useProtectedArea } from './protected-area';
import { registerAuth } from './register-auth';
import { useLogout } from './useLogout';

/** P4b — P4a의 주입 지점(`setAuthHandlers`·`useLogout`)에 실제 v1 호출이 붙었는지(요청 모양은 api-contract §9) */

let assign: ReturnType<typeof vi.spyOn>;
let reload: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  localStorage.clear();
  resetSessionFlagStateForTest();
  window.history.replaceState(null, '', '/gate-check');
  assign = vi.spyOn(browserLocation, 'assign').mockImplementation(() => {});
  reload = vi.spyOn(browserLocation, 'reload').mockImplementation(() => {});
});
afterEach(() => {
  setAuthHandlers(null);
  vi.restoreAllMocks();
});

function ProtectedArea() {
  useProtectedArea();
  return null;
}

describe('재발급(registerAuth → setAuthHandlers.refresh)', () => {
  it('만료 상태에서 GM-1 401이면 본문 없이 쿠키로 재발급하고 GM-1을 다시 보내 세션을 받는다', async () => {
    startSession();
    const qc = createTestQueryClient();
    const cleanup = registerAuth(qc);
    let meCalls = 0;
    server.use(
      http.get('*/api/v2/me', ({ request }) =>
        ++meCalls === 1 ? errors.expiredToken(request) : ok(me),
      ),
      ...authHandlers.refreshOk,
    );
    const sent = recordRequests();

    await expect(qc.fetchQuery(meQuery())).resolves.toEqual(me);

    expect(await sent.list()).toMatchObject([
      { method: 'GET', path: '/api/v2/me', credentials: 'include' },
      {
        method: 'POST',
        path: '/api/v1/auth/token/refresh',
        query: {},
        body: undefined,
        credentials: 'include',
      },
      { method: 'GET', path: '/api/v2/me', credentials: 'include' },
    ]);
    expect(assign).not.toHaveBeenCalled();
    cleanup();
  });

  it('정지·탈퇴 계정 토큰(익명 처리 401 AUTH_401_2) → 재발급 403 USER_403_1 → 세션 상실, 보호 화면이면 /login/expired', async () => {
    startSession();
    const qc = createTestQueryClient();
    const cleanup = registerAuth(qc);
    const area = renderWithProviders(<ProtectedArea />, { queryClient: qc });
    server.use(...meHandlers.anonymous, ...authHandlers.refreshSuspended);

    // 세션 상실 처리가 캐시를 비우며 진행 중인 조회를 취소한다(CancelledError) — 결과가 아니라 처리를 본다
    await qc.fetchQuery(meQuery()).catch(() => undefined);

    expect(assign).toHaveBeenCalledWith('/login/expired?redirect=%2Fgate-check');
    expect(readSessionFlag()).toBeNull();
    area.unmount();
    cleanup();
  });

  it('공개 화면에서 같은 일이 생기면 같은 주소를 익명으로 다시 그린다', async () => {
    startSession();
    window.history.replaceState(null, '', '/events/3');
    const qc = createTestQueryClient();
    const cleanup = registerAuth(qc);
    server.use(...meHandlers.anonymous, ...authHandlers.refreshSuspended);
    // 세션 상실 처리가 캐시를 비우며 진행 중인 조회를 취소한다(CancelledError) — 결과가 아니라 처리를 본다
    await qc.fetchQuery(meQuery()).catch(() => undefined);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(assign).not.toHaveBeenCalled();
    cleanup();
  });
});

describe('로그아웃(useLogout)', () => {
  it('본문 없이 쿠키로 POST /api/v1/auth/logout 을 부르고 로컬을 정리해 / 로 간다', async () => {
    startSession();
    const sent = recordRequests();
    const qc = createTestQueryClient();
    qc.setQueryData(meQuery().queryKey, me);
    const { result } = renderHook(() => useLogout(), {
      wrapper: ({ children }) => renderWrapper(qc, children),
    });
    await act(() => result.current.logout());
    expect(await sent.list()).toEqual([
      {
        method: 'POST',
        path: '/api/v1/auth/logout',
        query: {},
        body: undefined,
        credentials: 'include',
      },
    ]);
    expect(qc.getQueryData(meQuery().queryKey)).toBeUndefined();
    expect(readSessionFlag()).toBeNull();
    expect(assign).toHaveBeenCalledWith('/');
  });
});

function renderWrapper(qc: QueryClient, children: ReactNode) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
