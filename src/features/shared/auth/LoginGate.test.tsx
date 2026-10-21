import { useQuery } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { authHandlers } from '@/api/__mocks__/auth.handlers';
import { meHandlers } from '@/api/__mocks__/me.handlers';
import { ok } from '@/api/__mocks__/respond';
import { server } from '@/api/__mocks__/server';
import { setAuthHandlers } from '@/api/auth-handlers';
import { api } from '@/api/http';
import { getQueryClient, setErrorNotifier } from '@/api/query-client';
import {
  readSessionFlag,
  resetSessionFlagStateForTest,
  SESSION_KEY,
  startSession,
} from '@/api/session-flag';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import { browserLocation } from './browser-location';
import { LoginGate } from './LoginGate';
import { registerAuth } from './register-auth';

const router = { replace: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

/** 보호 화면 children이 부르는 API. 게이트가 세션을 확정하기 전에는 한 번도 불리면 안 된다 */
let probeCalls = 0;
const probe = http.get('*/api/v2/probe', () => {
  probeCalls += 1;
  return ok({ ok: true });
});
function ProtectedChild() {
  const { data } = useQuery({
    queryKey: ['probe'],
    queryFn: () => api.get('probe', z.object({ ok: z.boolean() })),
  });
  return <p>보호 화면{data ? ' 로드됨' : ''}</p>;
}

let assign: ReturnType<typeof vi.spyOn>;
let reload: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  probeCalls = 0;
  localStorage.clear();
  resetSessionFlagStateForTest();
  window.history.replaceState(null, '', '/gate-check?tab=1');
  server.use(probe);
  assign = vi.spyOn(browserLocation, 'assign').mockImplementation(() => {});
  reload = vi.spyOn(browserLocation, 'reload').mockImplementation(() => {});
});
afterEach(() => {
  setAuthHandlers(null);
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

function renderGate(queryClient = createTestQueryClient()) {
  const cleanup = registerAuth(queryClient);
  const view = renderWithProviders(
    <LoginGate>
      <ProtectedChild />
    </LoginGate>,
    { queryClient },
  );
  return { ...view, cleanup };
}

describe('로그인 게이트', () => {
  it('세션 확인 중에는 스켈레톤, 확정되면 children — children의 쿼리는 그 뒤에만 나간다', async () => {
    startSession();
    let releaseMe: () => void = () => {};
    server.use(
      http.get('*/api/v2/me', async () => {
        await new Promise<void>((r) => (releaseMe = r));
        return ok({
          userId: 1,
          name: '두둥이',
          email: null,
          profileImageUrl: null,
          hosts: [],
          hostCount: 0,
        });
      }),
    );
    renderGate();
    expect(screen.getByRole('status', { name: '로그인 확인 중' })).toBeInTheDocument();
    expect(screen.queryByText(/보호 화면/)).not.toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 30));
    expect(probeCalls).toBe(0);
    releaseMe();
    expect(await screen.findByText('보호 화면 로드됨')).toBeInTheDocument();
    expect(probeCalls).toBe(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('비로그인(표시 없음 + 401) → 요청 없이 /login?redirect=현재주소 로 replace, children은 그리지 않는다', async () => {
    server.use(...meHandlers.anonymous);
    renderGate();
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/login?redirect=%2Fgate-check%3Ftab%3D1'),
    );
    expect(screen.queryByText(/보호 화면/)).not.toBeInTheDocument();
    expect(probeCalls).toBe(0);
    expect(assign).not.toHaveBeenCalled();
  });

  it('GM-1이 502(HTML)면 전체 화면 재시도를 그리고 이동하지 않는다. 다시 시도하면 들어간다', async () => {
    startSession();
    server.use(
      http.get('*/api/v2/me', () => new HttpResponse('<html>502</html>', { status: 502 }), {
        once: true,
      }),
      ...meHandlers.loggedIn,
    );
    const { user } = renderGate();
    expect(await screen.findByRole('alert')).toHaveTextContent('불러오지 못했어요');
    expect(router.replace).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
    expect(probeCalls).toBe(0);
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('보호 화면 로드됨')).toBeInTheDocument();
  });

  it('재발급 일시 오류(5xx)도 재시도 화면 — 세션 표시는 남는다', async () => {
    startSession();
    server.use(...meHandlers.expired, ...authHandlers.refreshServerError);
    renderGate();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(readSessionFlag()).not.toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it('만료 + 재발급 성공 → 재시도한 GM-1로 들어간다', async () => {
    startSession();
    let refreshed = false;
    server.use(
      http.get('*/api/v2/me', ({ request }) =>
        refreshed
          ? ok({
              userId: 1,
              name: '두둥이',
              email: null,
              profileImageUrl: null,
              hosts: [],
              hostCount: 0,
            })
          : HttpResponse.json(
              { success: false, status: 401, code: 'AUTH_401_1', reason: '', path: request.url },
              { status: 401 },
            ),
      ),
      http.post('*/api/v1/auth/token/refresh', () => {
        refreshed = true;
        return ok(null);
      }),
    );
    renderGate();
    expect(await screen.findByText('보호 화면 로드됨')).toBeInTheDocument();
  });

  it('만료 + 재발급 403 → 보호 영역이라 /login/expired?redirect=… 로 하드 이동. 토스트·에러 화면 없음', async () => {
    startSession();
    const notify = vi.fn();
    setErrorNotifier(notify);
    server.use(...meHandlers.expired, ...authHandlers.refreshRejected);
    // 앱의 QueryClient(전역 onError 토스트가 붙은 것)로 그린다
    const appClient = getQueryClient();
    renderGate(appClient);
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith('/login/expired?redirect=%2Fgate-check%3Ftab%3D1'),
    );
    expect(assign).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
    // 게이트는 /login으로 보내지 않는다(세션 상실 처리에 맡긴다)
    await new Promise((r) => setTimeout(r, 30));
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(notify).not.toHaveBeenCalled();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    setErrorNotifier(null);
    appClient.clear();
  });
});
