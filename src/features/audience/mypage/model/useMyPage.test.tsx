import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { meHandlers, resetMeStore, userError } from '@/api/__mocks__/me.handlers';
import { MOCK_IMAGE_ORIGIN } from '@/api/__mocks__/respond';
import { server } from '@/api/__mocks__/server';
import { userHandlers } from '@/api/__mocks__/user.handlers';
import { hostViewerQuery } from '@/api/host/queries';
import { followingHostsQuery, meQuery } from '@/api/me/queries';
import { UpdateMeRequestSchema } from '@/api/me/schema';
import { shouldToastMutationError, shouldToastQueryError } from '@/api/query-client';
import { readSessionFlag, startSession } from '@/api/session-flag';
import { browserLocation } from '@/features/shared/auth/browser-location';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { useArchive } from './useArchive';
import { useFollowingHosts } from './useFollowingHosts';
import { useProfileEdit } from './useProfileEdit';
import { useWithdraw, WITHDRAW_MASTER_MESSAGE } from './useWithdraw';

let restore: () => void;
beforeEach(() => {
  resetMeStore();
  resetHostMockState();
  restore = installLoggedInFetch();
});
afterEach(() => {
  vi.restoreAllMocks();
  restore();
});

function setup() {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

const lastMutation = (qc: ReturnType<typeof createTestQueryClient>) =>
  qc.getMutationCache().getAll().at(-1)!;
const writes = async (sent: ReturnType<typeof recordRequests>) =>
  (await sent.list()).filter((r) => r.method !== 'GET');
const png = () => new File(['x'], 'me.png', { type: 'image/png' });

async function renderProfile() {
  const ctx = setup();
  await ctx.queryClient.fetchQuery(meQuery());
  const r = renderHook(() => useProfileEdit(), { wrapper: ctx.wrapper });
  await waitFor(() => expect(r.result.current.profile).toBeDefined());
  return { ...r, ...ctx };
}

describe('프로필 — useProfileEdit(GM-1 · PM-2 · PM-3)', () => {
  it('닉네임: 앞뒤 공백을 지워 PM-2 {name}, 응답으로 세션 키(GM-1)를 갱신한다', async () => {
    const sent = recordRequests();
    const { result, queryClient } = await renderProfile();
    await act(() => result.current.name.save(' 새닉네임 '));
    const patches = await writes(sent);
    expect(patches).toMatchObject([
      { method: 'PATCH', path: '/api/v2/me', body: { name: '새닉네임' } },
    ]);
    expect(UpdateMeRequestSchema.safeParse(patches[0]!.body).success).toBe(true);
    expect(queryClient.getQueryData(meQuery().queryKey)?.name).toBe('새닉네임');
    // 캐시 → 훅 재렌더는 TanStack notifyManager의 setTimeout(0) 뒤라 act가 기다려 주지 않는다(아래 「기본 이미지로」)
    await waitFor(() => expect(result.current.profile?.name).toBe('새닉네임'));
  });

  it.each([
    ['', '닉네임을 입력해 주세요'],
    ['가', '닉네임은 2~7자로 입력해 주세요'],
    ['가나다라마바사아', '닉네임은 2~7자로 입력해 주세요'],
  ])('닉네임 %j는 요청 없이 칸 오류 "%s"', async (name, message) => {
    const sent = recordRequests();
    const { result } = await renderProfile();
    await act(() => result.current.name.save(name));
    expect(await writes(sent)).toEqual([]);
    expect(result.current.name.error).toBe(message);
  });

  it('에러 분기 USER_400_4(공백만) → 칸 오류, 토스트 없음', async () => {
    server.use(...meHandlers.updateFails('USER_400_4'));
    const { result, queryClient } = await renderProfile();
    await act(() => result.current.name.save('두둥두둥'));
    await waitFor(() =>
      expect(result.current.name.error).toBe('닉네임은 공백만으로 지을 수 없어요'),
    );
    const m = lastMutation(queryClient);
    expect(shouldToastMutationError(m.state.error, m.meta)).toBe(false);
  });

  it('이미지: PM-3 발급 → S3 PUT → PM-2 {profileImageKey} → 세션 키의 profileImageUrl이 바뀐다', async () => {
    const sent = recordRequests();
    const { result, queryClient } = await renderProfile();
    await act(() => result.current.image.change(png()));
    const list = await writes(sent);
    expect(list.map((r) => r.method)).toEqual(['POST', 'PUT', 'PATCH']);
    expect(list[0]).toMatchObject({ path: '/api/v2/me/images', body: { extension: 'PNG' } });
    expect(list[1]).toMatchObject({ credentials: 'omit' });
    const key = (list[2]!.body as { profileImageKey: string }).profileImageKey;
    expect(key).toMatch(/^user\/1\/.+\.png$/);
    expect(list[1]!.path).toContain(key);
    expect(queryClient.getQueryData(meQuery().queryKey)?.profileImageUrl).toBe(
      `${MOCK_IMAGE_ORIGIN}/${key}`,
    );
  });

  it('에러 분기 USER_400_5(본인 이미지 아님) → 안내, retry()는 같은 파일로 PM-3 발급부터 다시', async () => {
    server.use(
      http.patch('*/api/v2/me', ({ request }) => userError(request, 'USER_400_5'), { once: true }),
    );
    const sent = recordRequests();
    const { result, queryClient } = await renderProfile();
    await act(() => result.current.image.change(png()));
    await waitFor(() => expect(result.current.image.error).toBe('이미지를 다시 올려 주세요'));
    const m = lastMutation(queryClient);
    expect(shouldToastMutationError(m.state.error, m.meta)).toBe(false);

    await act(() => result.current.image.retry());
    expect(
      (await writes(sent)).map((r) => `${r.method} ${r.path.startsWith('/api') ? r.path : 's3'}`),
    ).toEqual([
      'POST /api/v2/me/images',
      'PUT s3',
      'PATCH /api/v2/me',
      'POST /api/v2/me/images',
      'PUT s3',
      'PATCH /api/v2/me',
    ]);
    expect(result.current.image.error).toBeNull();
    expect(result.current.profile?.profileImageUrl).not.toBeNull();
  });

  it('JPG·PNG가 아니면 요청 없이 안내', async () => {
    const sent = recordRequests();
    const { result } = await renderProfile();
    await act(() => result.current.image.change(new File(['x'], 'a.gif', { type: 'image/gif' })));
    expect(await writes(sent)).toEqual([]);
    expect(result.current.image.error).toBe('JPG·PNG 이미지만 올릴 수 있어요');
  });

  it('기본 이미지로: PM-2 {profileImageKey: ""} → profileImageUrl null', async () => {
    const sent = recordRequests();
    const { result, queryClient } = await renderProfile();
    await act(() => result.current.image.change(png()));
    // mutateAsync가 끝나도 훅에 isPending=false·새 프로필이 오는 것은 TanStack notifyManager가 setTimeout(0)으로 미룬
    // 알림 뒤다 — act는 그 매크로태스크를 기다리지 않는다. 낡은 렌더(pending)의 reset()은 아무것도 보내지 않으므로 기다린다
    await waitFor(() => expect(result.current.image.pending).toBe(false));
    await act(() => result.current.image.reset());
    expect((await writes(sent)).map((r) => r.method)).toEqual(['POST', 'PUT', 'PATCH', 'PATCH']);
    expect((await writes(sent)).at(-1)).toMatchObject({
      method: 'PATCH',
      body: { profileImageKey: '' },
    });
    expect(queryClient.getQueryData(meQuery().queryKey)?.profileImageUrl).toBeNull();
    await waitFor(() => expect(result.current.profile?.profileImageUrl).toBeNull());
  });
});

describe('관심 호스트 — useFollowingHosts(GM-4 · PH-13 DELETE)', () => {
  it('status=ALL 첫 페이지를 쿠키와 함께 읽고, 대표 공연 배지를 붙인다', async () => {
    const sent = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(() => useFollowingHosts(), { wrapper });
    await waitFor(() => expect(result.current.listStatus).toBe('success'));
    expect((await sent.list()).find((r) => r.path === '/api/v2/me/following-hosts')).toMatchObject({
      query: { status: 'ALL', page: '0' },
      credentials: 'include',
    });
    expect(result.current.hosts).toHaveLength(20);
    expect(result.current.hasNextPage).toBe(true);
    const byId = (id: number) => result.current.hosts.find((h) => h.hostId === id)!;
    expect(byId(12)).toMatchObject({ badge: 'D-7', href: '/hosts/12', eventHref: '/events/102' });
    expect(byId(31).badge).toBe('공연 종료');
    expect(byId(32)).toMatchObject({ badge: null, eventHref: null });
  });

  it.each([
    ['ACTIVE', (b: string | null) => b !== null && /^D-|공연 중/.test(b)],
    ['ENDED', (b: string | null) => b === '공연 종료'],
  ] as const)('탭 %s → 그 status로 첫 페이지부터 다시 읽는다', async (status, isBadge) => {
    const sent = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(() => useFollowingHosts(), { wrapper });
    await waitFor(() => expect(result.current.listStatus).toBe('success'));
    act(() => result.current.setStatus(status));
    await waitFor(() => expect(result.current.status).toBe(status));
    await waitFor(() => expect(result.current.hosts.length).toBeGreaterThan(0));
    await waitFor(() => expect(result.current.hosts.every((h) => isBadge(h.badge))).toBe(true));
    const queries = (await sent.list())
      .filter((r) => r.path === '/api/v2/me/following-hosts')
      .map((r) => r.query);
    expect(queries.at(-1)).toEqual({ status, page: '0' });
  });

  it('해제하면 DELETE 뒤 모든 필터의 목록에서 빠지고, 목록을 다시 읽지 않는다', async () => {
    const sent = recordRequests();
    const { wrapper, queryClient } = setup();
    await queryClient.fetchInfiniteQuery(followingHostsQuery({ status: 'ENDED' }));
    const { result } = renderHook(() => useFollowingHosts(), { wrapper });
    await waitFor(() => expect(result.current.listStatus).toBe('success'));
    act(() => result.current.unfollow(31));
    expect(result.current.isUnfollowing(31)).toBe(true);
    await waitFor(() => expect(result.current.hosts.some((h) => h.hostId === 31)).toBe(false));
    expect(result.current.isUnfollowing(31)).toBe(false);
    expect(await writes(sent)).toMatchObject([
      { method: 'DELETE', path: '/api/v2/hosts/31/follow' },
    ]);
    const ended = queryClient.getQueryData(followingHostsQuery({ status: 'ENDED' }).queryKey);
    expect(ended?.pages.flatMap((p) => p.content).some((h) => h.hostId === 31)).toBe(false);
    // ENDED 미리 읽기 + ALL 첫 페이지 두 번뿐 — 해제 뒤 목록을 다시 읽지 않는다
    expect((await sent.list()).filter((r) => r.path === '/api/v2/me/following-hosts')).toHaveLength(
      2,
    );
    // 다시 들어와도 서버(mock) 목록에 없다
    const fresh = await createTestQueryClient().fetchInfiniteQuery(followingHostsQuery());
    expect(fresh.pages[0]!.content.some((h) => h.hostId === 31)).toBe(false);
  });

  it('호스트 홈 viewer 캐시가 있으면 isFollowing도 맞춘다', async () => {
    const { wrapper, queryClient } = setup();
    await queryClient.fetchQuery(hostViewerQuery('12'));
    expect(queryClient.getQueryData(hostViewerQuery('12').queryKey)?.isFollowing).toBe(true);
    const { result } = renderHook(() => useFollowingHosts(), { wrapper });
    await waitFor(() => expect(result.current.listStatus).toBe('success'));
    act(() => result.current.unfollow(12));
    await waitFor(() => expect(result.current.hosts.some((h) => h.hostId === 12)).toBe(false));
    expect(queryClient.getQueryData(hostViewerQuery('12').queryKey)?.isFollowing).toBe(false);
  });

  it('다음 페이지 실패는 기존 행을 두고 하단 재시도 — 전역 토스트 없음', async () => {
    server.use(...meHandlers.followingNextPageError);
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useFollowingHosts(), { wrapper });
    await waitFor(() => expect(result.current.listStatus).toBe('success'));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.nextPageError).toBe(true));
    expect(result.current.hosts).toHaveLength(20);
    const q = queryClient.getQueryCache().find({ queryKey: followingHostsQuery().queryKey })!;
    expect(shouldToastQueryError(q.state.error, q.state)).toBe(false);
    server.resetHandlers();
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.hosts).toHaveLength(25));
  });
});

describe('관람 공연 아카이빙 — useArchive(GM-5)', () => {
  it('전체(year 없음)로 읽고, 연도 탭은 응답 years, orderUuid=null이면 주문상세로 가지 않는다', async () => {
    const sent = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(() => useArchive(), { wrapper });
    await waitFor(() => expect(result.current.listStatus).toBe('success'));
    expect((await sent.list()).find((r) => r.path === '/api/v2/me/archive')?.query).toEqual({
      page: '0',
    });
    expect(result.current.tabs.map((t) => t.label)).toEqual(['전체', '2026', '2025']);
    const byId = (id: number) => result.current.events.find((e) => e.eventId === id)!;
    expect(byId(91).orderHref).toBeNull();
    expect(byId(90).orderHref).toBe('/orders/mock-order-p9-past');
  });

  it('연도 탭을 바꾸면 그 year로 첫 페이지부터 읽고, 읽는 동안 탭을 유지한다', async () => {
    const sent = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(() => useArchive(), { wrapper });
    await waitFor(() => expect(result.current.listStatus).toBe('success'));
    act(() => result.current.setYear(2025));
    expect(result.current.tabs).toHaveLength(3);
    await waitFor(() => expect(result.current.switching).toBe(false));
    expect(result.current.events.map((e) => e.eventId)).toEqual([80]);
    expect(
      (await sent.list()).filter((r) => r.path === '/api/v2/me/archive').at(-1)?.query,
    ).toEqual({
      page: '0',
      year: '2025',
    });
  });

  it('입장한 지난 공연이 없으면 빈 상태', async () => {
    server.use(...meHandlers.archiveEmpty);
    const { wrapper } = setup();
    const { result } = renderHook(() => useArchive(), { wrapper });
    await waitFor(() => expect(result.current.empty).toBe(true));
    expect(result.current.tabs).toEqual([{ year: null, label: '전체' }]);
  });
});

describe('회원 탈퇴 — useWithdraw(v1 DELETE /api/v1/auth/me)', () => {
  it('성공하면 캐시와 dd:session을 지우고 홈으로 하드 이동한다', async () => {
    const assign = vi.spyOn(browserLocation, 'assign').mockImplementation(() => {});
    startSession();
    const sent = recordRequests();
    const { wrapper, queryClient } = setup();
    await queryClient.fetchQuery(meQuery());
    const { result } = renderHook(() => useWithdraw(), { wrapper });
    await act(() => result.current.withdraw());
    expect(await writes(sent)).toMatchObject([
      { method: 'DELETE', path: '/api/v1/auth/me', credentials: 'include' },
    ]);
    expect(assign).toHaveBeenCalledWith('/');
    expect(readSessionFlag()).toBeNull();
    expect(queryClient.getQueryData(meQuery().queryKey)).toBeUndefined();
  });

  it('에러 분기 USER_400_6 → "마스터를 양도한 뒤 탈퇴해 주세요", 이동 없음, 토스트 없음', async () => {
    server.use(...userHandlers.masterBlocked);
    const assign = vi.spyOn(browserLocation, 'assign').mockImplementation(() => {});
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useWithdraw(), { wrapper });
    await act(() => result.current.withdraw());
    expect(result.current.error).toBe(WITHDRAW_MASTER_MESSAGE);
    expect(assign).not.toHaveBeenCalled();
    const m = lastMutation(queryClient);
    expect(shouldToastMutationError(m.state.error, m.meta)).toBe(false);
  });
});
