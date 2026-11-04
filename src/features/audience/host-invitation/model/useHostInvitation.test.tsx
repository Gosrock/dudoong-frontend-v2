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

  it('이미 멤버면 alreadyMember + 기존 역할(마스터)', async () => {
    restore = installLoggedInFetch();
    const { result } = open(MOCK_INVITE_TOKEN.member);
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    await act(() => result.current.accept());
    expect(result.current.state).toMatchObject({
      status: 'accepted',
      result: { role: 'MASTER', alreadyMember: true },
    });
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
