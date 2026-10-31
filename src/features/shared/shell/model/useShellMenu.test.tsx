import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { me as fixtureMe } from '@/api/__mocks__/fixtures/me';
import { resetNotificationStore } from '@/api/__mocks__/fixtures/notification';
import { ok } from '@/api/__mocks__/respond';
import { server } from '@/api/__mocks__/server';
import { resetSessionFlagStateForTest } from '@/api/session-flag';
import { browserLocation } from '@/features/shared/auth/browser-location';
import {
  resetKakaoCallbackForTest,
  useKakaoCallback,
} from '@/features/shared/auth/model/useKakaoCallback';
import { useKakaoLogin } from '@/features/shared/auth/model/useKakaoLogin';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { SHELL_HOSTS_MORE_HREF } from './shell-menu';
import { type ShellMenuState, useShellMenu } from './useShellMenu';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const ME = 'GET /api/v2/me';
const COUNT = 'GET /api/v2/me/notifications/unread-count';

let restore: (() => void) | null = null;
let assign: ReturnType<typeof vi.spyOn>;
let replace: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetSessionFlagStateForTest();
  resetNotificationStore();
  resetKakaoCallbackForTest();
  window.history.replaceState(null, '', '/events?tag=1');
  assign = vi.spyOn(browserLocation, 'assign').mockImplementation(() => {});
  replace = vi.spyOn(browserLocation, 'replace').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  restore?.();
  restore = null;
});
const loggedIn = () => {
  restore = installLoggedInFetch();
};

/** 훅 하나를 그린다. 같은 QueryClient를 쓰는 두 메뉴(햄버거 + 아바타 드롭다운)는 `useBoth` */
function renderMenu() {
  const queryClient = createTestQueryClient();
  let current: ShellMenuState = { status: 'pending' };
  function Probe() {
    current = useShellMenu();
    return null;
  }
  renderWithProviders(<Probe />, { queryClient });
  return { menu: () => current, queryClient };
}

function ready(state: ShellMenuState) {
  if (state.status !== 'ready') throw new Error(`not ready: ${state.status}`);
  return state;
}

describe('셸 메뉴 — useShellMenu', () => {
  it('세션 확인 중에는 pending(메뉴 없음), 로그인이 확정되면 세션 메뉴 + GN-2(쿠키 포함)로 빨간 점', async () => {
    loggedIn();
    const sent = recordRequests();
    const { menu } = renderMenu();
    expect(menu().status).toBe('pending');
    await waitFor(() => expect(ready(menu()).hasUnread).toBe(true));
    const m = ready(menu());
    expect(m.menu.kind).toBe('session');
    expect(m.logout).not.toBeNull();
    const count = (await sent.list()).find((r) => `${r.method} ${r.path}` === COUNT);
    expect(count?.credentials).toBe('include');
  });

  it('햄버거와 아바타 드롭다운이 같은 메뉴를 받는다 — GM-1은 한 번만 나간다', async () => {
    loggedIn();
    const sent = recordRequests();
    const queryClient = createTestQueryClient();
    const seen: ShellMenuState[] = [];
    function Hamburger() {
      seen[0] = useShellMenu();
      return null;
    }
    function AvatarDropdown() {
      seen[1] = useShellMenu();
      return null;
    }
    renderWithProviders(
      <>
        <Hamburger />
        <AvatarDropdown />
      </>,
      { queryClient },
    );
    await waitFor(() => expect(seen.map((s) => s?.status)).toEqual(['ready', 'ready']));
    expect(ready(seen[0]!).menu).toEqual(ready(seen[1]!).menu);
    expect((await sent.lines()).filter((l) => l === ME)).toHaveLength(1);
  });

  it('비로그인: 보호 항목은 로그인으로, [로그인]은 지금 주소로 돌아오고, GN-2를 부르지 않으며 로그아웃이 없다', async () => {
    const sent = recordRequests();
    const { menu } = renderMenu();
    await waitFor(() => expect(menu().status).toBe('ready'));
    const m = ready(menu());
    if (m.menu.kind !== 'anonymous') throw new Error('anonymous expected');
    expect(m.menu.login.href).toBe('/login?redirect=%2Fevents%3Ftag%3D1');
    expect(m.menu.bell.href).toBe('/login?redirect=%2Fmypage%2Fnotifications');
    expect(m.hasUnread).toBe(false);
    expect(m.logout).toBeNull();
    m.refreshBell();
    await new Promise((r) => setTimeout(r, 20));
    expect(await sent.lines()).toEqual([ME]);
  });

  it('GM-1이 5xx면 error — 다시 시도하면 메뉴가 나온다', async () => {
    loggedIn();
    server.use(
      http.get('*/api/v2/me', () => new HttpResponse('<html>502</html>', { status: 502 }), {
        once: true,
      }),
    );
    const { menu } = renderMenu();
    await waitFor(() => expect(menu().status).toBe('error'));
    const state = menu();
    if (state.status !== 'error') throw new Error('error expected');
    act(() => state.retry());
    await waitFor(() => expect(menu().status).toBe('ready'));
  });

  it('호스트 줄: GM-1 hosts 10개 + hostCount 37 → 10개 + 27개 더 보기(공연준비 홈 호스트 탭)', async () => {
    loggedIn();
    const hosts = Array.from({ length: 10 }, (_, i) => ({
      hostId: 100 + i,
      name: `호스트${i}`,
      profileImageUrl: null,
      myRole: 'GUEST' as const,
    }));
    server.use(http.get('*/api/v2/me', () => ok({ ...fixtureMe, hosts, hostCount: 37 })));
    const { menu } = renderMenu();
    await waitFor(() => expect(menu().status).toBe('ready'));
    const row = ready(menu()).menu.hostRow;
    expect(row.hosts).toHaveLength(10);
    expect(row.emptyText).toBeNull();
    expect(row.more).toEqual({ count: 27, href: SHELL_HOSTS_MORE_HREF });
  });

  it('로그아웃: 쿠키로 POST /api/v1/auth/logout 을 부르고 / 로 하드 이동', async () => {
    loggedIn();
    const sent = recordRequests();
    const { menu } = renderMenu();
    await waitFor(() => expect(menu().status).toBe('ready'));
    await act(() => ready(menu()).logout!.logout());
    const logout = (await sent.list()).find((r) => r.path === '/api/v1/auth/logout');
    expect(logout).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(assign).toHaveBeenCalledWith('/');
  });
});

describe('미로그인 항목 → 로그인 → 그 항목으로 복귀(P4b-L 콜백)', () => {
  it.each(['bell', 'orders', 'hosting', 'newEvent'] as const)(
    '%s: 메뉴 주소의 redirect가 로그인 버튼에 보관되고, 카카오 콜백이 끝나면 그 경로로 replace',
    async (key) => {
      const { menu } = renderMenu();
      await waitFor(() => expect(menu().status).toBe('ready'));
      const m = ready(menu()).menu;
      const link = [m.bell, ...m.shortcuts, ...m.items, ...m.create].find((l) => l.key === key)!;
      expect(link.viaLogin).toBe(true);

      // Given: 메뉴 주소(`/login?redirect=…`)로 로그인 화면에 왔다 — LoginView가 `?redirect=`를 useKakaoLogin에 넘긴다
      const url = new URL(link.href, 'http://localhost');
      expect(url.pathname).toBe('/login');
      const login = renderHook(() => useKakaoLogin(url.searchParams.get('redirect')));
      // When: [카카오 로그인] → (카카오) → 콜백
      await act(() => login.result.current.start());
      expect(assign).toHaveBeenCalledWith(expect.stringMatching(/^https?:\/\//));
      renderHook(() => useKakaoCallback('code=mock-existing&state=s1'));
      // Then: 메뉴 항목의 원래 목적지로 돌아온다
      await waitFor(() => expect(replace).toHaveBeenCalledWith(link.to));
    },
  );
});
