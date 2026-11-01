import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { type ReactNode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hostSets, resetHostMockState } from '@/api/__mocks__/host.handlers';
import { actAsRole, membersOf, removeStoredMember } from '@/api/__mocks__/host-store';
import { resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { ok } from '@/api/__mocks__/respond';
import { server } from '@/api/__mocks__/server';
import { isEventManageQueryKey, MY_EVENTS_KEY } from '@/api/event/queries';
import { hostMembersQuery, hostViewerQuery, MY_HOSTS_KEY } from '@/api/host/queries';
import { AddHostMembersRequestSchema, HostMembersSchema } from '@/api/host/schema';
import { errorToast } from '@/test/error-toast';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { useHostMembers } from './useHostMembers';
import { useInviteMembers } from './useInviteMembers';

let restore: () => void;
beforeEach(() => {
  resetHostMockState();
  resetHostingStore();
  restore = installLoggedInFetch();
});
afterEach(() => {
  vi.restoreAllMocks();
  restore();
  resetHostMockState();
});

function wrap(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <Suspense fallback="불러오는 중">{children}</Suspense>
      </QueryClientProvider>
    );
  };
}

function setup(hostId = '11') {
  const queryClient = createTestQueryClient();
  return {
    ...renderHook(() => useHostMembers(hostId), { wrapper: wrap(queryClient) }),
    queryClient,
  };
}

type Members = ReturnType<typeof setup>['result'];
const loaded = (result: Members) => waitFor(() => expect(result.current).not.toBeNull());
const lastMutation = (qc: QueryClient) => qc.getMutationCache().getAll().at(-1)!;
const writes = async (sent: ReturnType<typeof recordRequests>) =>
  (await sent.list()).filter((r) => r.method !== 'GET');
/** 이름 → [역할, 역할 변경 대상, 삭제, 양도] */
const view = (result: Members) =>
  Object.fromEntries(
    result.current.members.map((m) => [
      m.name ?? `#${m.userId}`,
      [m.role, m.actions.changeRoleTo, m.actions.remove, m.actions.transfer],
    ]),
  );

describe('멤버 목록 — 3시점 버튼(api-contract §2)', () => {
  it('SUPER_ADMIN 시점(GH-6 성공 + viewer myRole null): 매니저 범위 + 역할 변경, 매니저 삭제·양도는 없다', async () => {
    // 서버: 권한 검사는 건너뛰지만(SuperAdminBypass) 매니저 추가·삭제는 요청자 = 마스터, 양도는 요청자 활성 마스터를 다시 본다
    server.use(
      http.get('*/api/v2/hosts/11/members', () => ok(membersOf(11))),
      ...hostSets.viewAs(11, { myRole: null }),
    );
    const { result } = setup();
    await loaded(result);
    expect(result.current.access).toBe('ok');
    expect(result.current.myRole).toBe('SUPER_ADMIN');
    expect(result.current.canInvite).toBe(true);
    expect(view(result)).toEqual({
      두둥이: ['MASTER', null, false, false],
      김매니저: ['MANAGER', 'GUEST', false, false],
      이드럼: ['GUEST', 'MANAGER', true, false],
      '#4': ['GUEST', 'MANAGER', true, false],
    });
  });

  it('마스터 시점: 마스터(나) 행은 메뉴 없음, 매니저·일반은 역할 변경·삭제·양도 — 초대 가능, 이메일 없음', async () => {
    const sent = recordRequests();
    const { result } = setup();
    await loaded(result);
    expect(result.current.myRole).toBe('MASTER');
    expect(result.current.canInvite).toBe(true);
    expect(view(result)).toEqual({
      두둥이: ['MASTER', null, false, false],
      김매니저: ['MANAGER', 'GUEST', true, true],
      이드럼: ['GUEST', 'MANAGER', true, true],
      '#4': ['GUEST', 'MANAGER', true, true],
    });
    expect(result.current.members[0]).toMatchObject({ isMe: true, roleLabel: '마스터' });
    expect(result.current.members.every((m) => !('email' in m))).toBe(true);
    // GH-3 viewer · GH-6 · GM-1을 함께 읽는다(쿠키)
    expect((await sent.lines()).sort()).toEqual([
      'GET /api/v2/hosts/11',
      'GET /api/v2/hosts/11/members',
      'GET /api/v2/me',
    ]);
  });

  it('매니저 시점: 일반 멤버 삭제만 — 매니저(나 포함)·마스터 행은 메뉴 없음', async () => {
    actAsRole(11, 'MANAGER');
    const { result } = setup();
    await loaded(result);
    expect(result.current.canInvite).toBe(true);
    expect(view(result)).toEqual({
      김매니저: ['MASTER', null, false, false],
      두둥이: ['MANAGER', null, false, false],
      이드럼: ['GUEST', null, true, false],
      '#4': ['GUEST', null, true, false],
    });
  });

  it('일반 시점: 목록만 — 초대·메뉴 없음', async () => {
    actAsRole(11, 'GUEST');
    const { result } = setup();
    await loaded(result);
    expect(result.current.canInvite).toBe(false);
    expect(
      result.current.members.every(
        (m) => !m.actions.changeRoleTo && !m.actions.remove && !m.actions.transfer,
      ),
    ).toBe(true);
  });

  it('권한 가이드 표에 "호스트 삭제" 행이 없다', async () => {
    const { result } = setup();
    await loaded(result);
    expect(result.current.permissionGuide.map((r) => r.label)).not.toContain('호스트 삭제');
  });
});

describe('멤버 변경 — 응답(멤버 전체 목록)으로 캐시 갱신', () => {
  it('역할 변경(PH-10): 응답을 GH-6 키에 넣고, 내 myRole 쿼리는 무효화하지 않는다', async () => {
    const sent = recordRequests();
    const { result, queryClient } = setup();
    await loaded(result);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    await act(() => result.current.changeRole(3, 'MANAGER'));
    const [patch] = await writes(sent);
    expect(patch).toMatchObject({
      method: 'PATCH',
      path: '/api/v2/hosts/11/members/3/role',
      body: { role: 'MANAGER' },
    });
    expect(view(result)['이드럼']).toEqual(['MANAGER', 'GUEST', true, true]);
    const cached = HostMembersSchema.parse(
      queryClient.getQueryData(hostMembersQuery('11').queryKey),
    );
    expect(cached.map((m) => [m.userId, m.role])).toEqual([
      [1, 'MASTER'],
      [2, 'MANAGER'],
      [3, 'MANAGER'],
      [4, 'GUEST'],
    ]);
    expect(invalidate).not.toHaveBeenCalled();
    // 응답을 넣었으므로 GH-6을 다시 읽지 않는다(처음 세 조회뿐)
    expect((await sent.lines()).filter((l) => l.startsWith('GET'))).toHaveLength(3);
  });

  it('행이 허용하지 않은 역할 변경은 보내지 않는다(마스터 행)', async () => {
    const sent = recordRequests();
    const { result } = setup();
    await loaded(result);
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.changeRole(1, 'GUEST');
    });
    expect(ok).toBe(false);
    expect(await writes(sent)).toEqual([]);
  });

  it('삭제(DH-11): 응답 목록으로 갱신하고 멤버 수가 바뀐 GH-3 두 키를 무효화', async () => {
    const sent = recordRequests();
    const { result, queryClient } = setup();
    await loaded(result);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    await act(() => result.current.remove(4));
    expect((await writes(sent))[0]).toMatchObject({
      method: 'DELETE',
      path: '/api/v2/hosts/11/members/4',
    });
    expect(result.current.members.map((m) => m.userId)).toEqual([1, 2, 3]);
    expect(invalidate.mock.calls.map(([f]) => [f?.queryKey, f?.exact])).toEqual([
      [['hosts', '11'], true],
      [['hosts', '11', 'viewer'], true],
    ]);
  });

  it('마스터 양도(PH-12): myRole 쿼리(GH-1·GH-3 viewer·GE-1·GE-3·GM-1)를 무효화 → 버튼이 매니저 기준으로 바뀐다', async () => {
    const sent = recordRequests();
    const { result, queryClient } = setup();
    await loaded(result);
    // GE-3 키가 캐시에 있다고 둔다(P11이 만든다)
    queryClient.setQueryData(['events', '140', 'manage'], { eventId: 140 });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    await act(() => result.current.transferMaster(2));
    expect((await writes(sent))[0]).toMatchObject({
      method: 'POST',
      path: '/api/v2/hosts/11/transfer-master',
      body: { userId: 2 },
    });
    await waitFor(() => expect(result.current.myRole).toBe('MANAGER'));
    expect(view(result)).toEqual({
      김매니저: ['MASTER', null, false, false],
      두둥이: ['MANAGER', null, false, false],
      이드럼: ['GUEST', null, true, false],
      '#4': ['GUEST', null, true, false],
    });
    const filters = invalidate.mock.calls.map(([f]) => f);
    expect(filters.map((f) => f?.queryKey).filter(Boolean)).toEqual(
      expect.arrayContaining([MY_HOSTS_KEY, hostViewerQuery('11').queryKey, MY_EVENTS_KEY, ['me']]),
    );
    expect(filters.some((f) => f?.predicate)).toBe(true);
    expect(queryClient.getQueryState(['events', '140', 'manage'])?.isInvalidated).toBe(true);
    expect(isEventManageQueryKey(['events', '140'])).toBe(false);
  });

  it('에러 분기 HOST_404_2(이미 없는 멤버) → GH-6을 다시 읽고 actionError, 토스트 없음', async () => {
    const { result } = setup();
    await loaded(result);
    // 다른 사람이 먼저 지웠다
    removeStoredMember(11, 3);
    const sent = recordRequests();
    await act(() => result.current.remove(3));
    expect(result.current.actionError).toBe('이미 멤버가 아니에요. 목록을 새로 불러왔어요');
    expect(errorToast).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.members.map((x) => x.userId)).toEqual([1, 2, 4]));
    expect(await sent.lines()).toContain('GET /api/v2/hosts/11/members');
  });
});

describe('멤버 초대 — useInviteMembers(PH-7)', () => {
  function setupInvite(myRole: 'MASTER' | 'MANAGER' | 'GUEST' = 'MASTER') {
    const queryClient = createTestQueryClient();
    return {
      ...renderHook(() => useInviteMembers('11', myRole), { wrapper: wrap(queryClient) }),
      queryClient,
    };
  }

  it('마스터는 매니저·일반, 매니저는 "일반" 고정 — 다른 역할로 바꾸지 못한다', () => {
    expect(setupInvite('MASTER').result.current.roleOptions).toEqual(['MANAGER', 'GUEST']);
    const { result } = setupInvite('MANAGER');
    expect(result.current.roleOptions).toEqual(['GUEST']);
    act(() => result.current.setRole(0, 'MANAGER'));
    expect(result.current.rows[0]!.role).toBe('GUEST');
  });

  it('일반 멤버는 보내지 않는다', async () => {
    const sent = recordRequests();
    const { result } = setupInvite('GUEST');
    act(() => result.current.setEmail(0, 'guitar@example.com'));
    await act(() => result.current.submit());
    expect(await writes(sent)).toEqual([]);
  });

  it('한 명 초대: {members:[{email, role}]}를 보내고 응답 목록을 GH-6 키에 — 폼은 한 줄로 비운다', async () => {
    const sent = recordRequests();
    const { result, queryClient } = setupInvite();
    act(() => {
      result.current.setEmail(0, ' guitar@example.com ');
      result.current.setRole(0, 'MANAGER');
    });
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.submit();
    });
    expect(ok).toBe(true);
    const [post] = await writes(sent);
    expect(post).toMatchObject({ method: 'POST', path: '/api/v2/hosts/11/members' });
    expect(AddHostMembersRequestSchema.parse(post!.body)).toEqual({
      members: [{ email: 'guitar@example.com', role: 'MANAGER' }],
    });
    const cached = HostMembersSchema.parse(
      queryClient.getQueryData(hostMembersQuery('11').queryKey),
    );
    expect(cached.map((m) => [m.name, m.role])).toEqual([
      ['두둥이', 'MASTER'],
      ['김매니저', 'MANAGER'],
      ['박기타', 'MANAGER'],
      ['이드럼', 'GUEST'],
      [null, 'GUEST'],
    ]);
    expect(result.current.rows).toEqual([{ email: '', role: 'GUEST' }]);
  });

  it('칸 오류(빈칸·형식·같은 이메일)가 있으면 보내지 않는다', async () => {
    const sent = recordRequests();
    const { result } = setupInvite();
    act(() => {
      result.current.addRow();
      result.current.addRow();
    });
    act(() => {
      result.current.setEmail(0, 'a@x.com');
      result.current.setEmail(1, 'bad');
      result.current.setEmail(2, 'A@x.com');
    });
    await act(() => result.current.submit());
    expect(await writes(sent)).toEqual([]);
    expect(result.current.errors).toEqual([
      null,
      '이메일 형식을 확인해 주세요',
      '같은 이메일을 두 번 넣었어요',
    ]);
  });

  it.each([
    [
      'nobody@example.com',
      'HOST_400_13',
      '가입되지 않은 이메일이에요. 상대가 두둥에 가입한 뒤 그 카카오 계정 이메일로 다시 초대해 주세요',
    ],
    ['DRUM@example.com', 'HOST_400_15', '이미 이 호스트의 멤버예요'],
    [
      'twin@example.com',
      'HOST_400_18',
      '같은 이메일로 가입된 계정이 여러 개예요. 두둥에 문의해 주세요',
    ],
  ])(
    '에러 분기 — 둘째 줄 %s가 실패(%s)하면 그 줄에만 사유, 아무도 추가되지 않고 토스트 없음',
    async (email, code, message) => {
      const { result, queryClient } = setupInvite();
      act(() => result.current.addRow());
      act(() => {
        result.current.setEmail(0, 'vocal@example.com');
        result.current.setEmail(1, email);
      });
      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.submit();
      });
      expect(ok).toBe(false);
      const m = lastMutation(queryClient);
      expect(m.state.error).toMatchObject({ code });
      expect(errorToast).not.toHaveBeenCalled();
      expect(result.current.serverErrors).toEqual([null, message]);
      expect(result.current.formError).toBeNull();
      // 그 줄을 고치면 그 줄의 사유를 지운다
      act(() => result.current.setEmail(1, 'guitar@example.com'));
      expect(result.current.serverErrors).toEqual([null, null]);
    },
  );

  it('매니저가 MANAGER를 보내는 경로는 없다 — 서버도 403 HOST_400_11(공용 토스트)', async () => {
    actAsRole(11, 'MANAGER');
    const res = await fetch('http://localhost:8080/api/v2/hosts/11/members', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ members: [{ email: 'guitar@example.com', role: 'MANAGER' }] }),
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'HOST_400_11' });
  });
});
