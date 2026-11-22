import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { MOCK_INVITE_TOKEN } from '@/api/__mocks__/host-store';
import { resetSessionFlagStateForTest } from '@/api/session-flag';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { HOST_INVITATIONS_PATH } from './invite-token';
import { useHostInvitation } from './useHostInvitation';

const router = { replace: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const STORAGE_KEY = 'dd:hostInvitation';

function open(token: string | null) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useHostInvitation(token), { wrapper });
}

let restore: (() => void) | null = null;
beforeEach(() => {
  resetHostMockState();
  resetSessionFlagStateForTest();
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, '', `/host-invitations/${MOCK_INVITE_TOKEN.valid}`);
});
afterEach(() => {
  restore?.();
  restore = null;
  vi.clearAllMocks();
});

describe('토큰 보호(B33② — 백엔드 #928)', () => {
  it('진입 직후 주소에서 토큰을 지운다 — 로그인 사용자는 저장소에 두지 않는다', async () => {
    restore = installLoggedInFetch();
    const { result } = open(MOCK_INVITE_TOKEN.valid);
    await waitFor(() => expect(window.location.pathname).toBe(HOST_INVITATIONS_PATH));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(window.location.href).not.toContain(MOCK_INVITE_TOKEN.valid);
  });

  it('익명이면 토큰을 탭 저장소에 두고, 토큰 없는 경로로 로그인에 보낸다', async () => {
    open(MOCK_INVITE_TOKEN.valid);
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        `/login?redirect=${encodeURIComponent(HOST_INVITATIONS_PATH)}`,
      ),
    );
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe(MOCK_INVITE_TOKEN.valid);
    expect(JSON.stringify(router.replace.mock.calls)).not.toContain(MOCK_INVITE_TOKEN.valid);
  });

  it('로그인에서 돌아오면(/host-invitations) 저장소에서 꺼내면서 지운다', async () => {
    window.history.replaceState(null, '', HOST_INVITATIONS_PATH);
    sessionStorage.setItem(STORAGE_KEY, MOCK_INVITE_TOKEN.valid);
    restore = installLoggedInFetch();
    const { result } = open(null);
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('저장소에 없으면 "링크를 다시 열어 주세요" — 요청하지 않는다', async () => {
    window.history.replaceState(null, '', HOST_INVITATIONS_PATH);
    restore = installLoggedInFetch();
    const sent = recordRequests();
    const { result } = open(null);
    await waitFor(() => expect(result.current.state.status).toBe('noToken'));
    expect(await sent.list()).toEqual([]);
  });
});

describe('수락(H-19 · H-20)', () => {
  it('수락하면 응답 역할로 합류 결과를 보인다', async () => {
    restore = installLoggedInFetch();
    const { result } = open(MOCK_INVITE_TOKEN.valid);
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    await act(() => result.current.accept());
    expect(result.current.state).toMatchObject({
      status: 'accepted',
      result: { hostId: 12, role: 'GUEST', alreadyMember: false },
      hostName: '소음공작소',
    });
  });

  it('이미 멤버면 수락을 스스로 한 번 불러 초대를 소비한다 — alreadyMember + 기존 역할(마스터)', async () => {
    restore = installLoggedInFetch();
    const { result } = open(MOCK_INVITE_TOKEN.member);
    // [수락하기]를 누르지 않아도(화면에 없다 — GUI 1427:4836) accepted가 된다
    await waitFor(() =>
      expect(result.current.state).toMatchObject({
        status: 'accepted',
        result: { role: 'MASTER', alreadyMember: true },
      }),
    );
    // 한 번만 — 다시 부르면 이미 사용된 초대(HOST_400_20)가 된다
    expect(await result.current.accept()).toBe(false);
  });

  it.each([
    [MOCK_INVITE_TOKEN.expired, 'expired'],
    [MOCK_INVITE_TOKEN.used, 'used'],
    [MOCK_INVITE_TOKEN.missing, 'missing'],
    ['bad token!', 'missing'],
  ])('쓸 수 없는 초대(%s) → %s', async (token, reason) => {
    restore = installLoggedInFetch();
    const { result } = open(token);
    await waitFor(() => expect(result.current.state).toEqual({ status: 'invalid', reason }));
  });
});

describe('거절(H-21 — Api 2.5.16, #348 B72)', () => {
  it('거절하면 {hostId, hostName} 결과 — 같은 링크로는 다시 수락 · 거절할 수 없다(HOST_400_20)', async () => {
    restore = installLoggedInFetch();
    const sent = recordRequests();
    const { result } = open(MOCK_INVITE_TOKEN.valid);
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.reject();
    });
    expect(ok).toBe(true);
    expect(result.current.state).toEqual({
      status: 'rejected',
      result: { hostId: 12, hostName: '소음공작소' },
    });
    expect((await sent.list()).filter((r) => r.method === 'POST').map((r) => r.path)).toEqual([
      `/api/v2/host-invitations/${MOCK_INVITE_TOKEN.valid}/reject`,
    ]);
    // 결과 화면에서는 더 부르지 않는다
    expect(await result.current.accept()).toBe(false);
    expect(await result.current.reject()).toBe(false);
    // 같은 링크를 새로 열면 이미 사용된 초대
    const again = open(MOCK_INVITE_TOKEN.valid);
    await waitFor(() =>
      expect(again.result.current.state).toEqual({ status: 'invalid', reason: 'used' }),
    );
  });

  it('거절 사이에 초대가 쓸 수 없게 되면(취소 · 만료 등) 그 결과 화면으로 — 확인 창은 닫힌다(true)', async () => {
    restore = installLoggedInFetch();
    const { result } = open(MOCK_INVITE_TOKEN.valid);
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    // 다른 탭에서 먼저 수락
    await fetch(`http://localhost:8080/api/v2/host-invitations/${MOCK_INVITE_TOKEN.valid}/accept`, {
      method: 'POST',
      credentials: 'include',
    });
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.reject();
    });
    expect(ok).toBe(true);
    expect(result.current.state).toEqual({ status: 'invalid', reason: 'used' });
  });
});
