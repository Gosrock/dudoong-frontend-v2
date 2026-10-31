import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http } from 'msw';
import { type ReactNode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NEW_APPROVED_ORDER_UUID, resetTicketStore } from '@/api/__mocks__/fixtures/my-ticket';
import { NOTIFICATION_ID, resetNotificationStore } from '@/api/__mocks__/fixtures/notification';
import { notificationHandlers } from '@/api/__mocks__/notification.handlers';
import { errors } from '@/api/__mocks__/respond';
import { server } from '@/api/__mocks__/server';
import { newApprovedTicketsQuery } from '@/api/my-ticket/queries';
import { unreadNotificationCountQuery } from '@/api/notification/queries';
import { shouldToastQueryError } from '@/api/query-client';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { useNotificationBell } from './useNotificationBell';
import { useNotificationInbox } from './useNotificationInbox';

let restore: (() => void) | null = null;
beforeEach(() => {
  resetTicketStore();
  resetNotificationStore();
});
afterEach(() => {
  vi.restoreAllMocks();
  restore?.();
  restore = null;
});
const loggedIn = () => {
  restore = installLoggedInFetch();
};

function setup() {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>{children}</Suspense>
    </QueryClientProvider>
  );
  return { queryClient, wrapper };
}

/** 벨과 알림함이 한 화면에 같이 있다(관객 헤더 + 알림함) */
function useBoth() {
  return { bell: useNotificationBell(), inbox: useNotificationInbox() };
}

const LIST = 'GET /api/v2/me/notifications';
const COUNT = 'GET /api/v2/me/notifications/unread-count';
const READ = 'POST /api/v2/me/notifications/read';
const NOTICE = 'GET /api/v2/me/tickets/new-approved';

describe('벨 — useNotificationBell', () => {
  it('비로그인이면 GN-2를 부르지 않고 벨을 그리지 않는다', async () => {
    const sent = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(() => useNotificationBell(), { wrapper });
    await waitFor(async () => expect(await sent.lines()).toContain('GET /api/v2/me'));
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current).toMatchObject({ visible: false, hasUnread: false });
    expect(await sent.lines()).not.toContain(COUNT);
  });

  it('로그인하면 GN-2(쿠키 포함)를 읽고 count > 0이면 빨간 점', async () => {
    loggedIn();
    const sent = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(() => useNotificationBell(), { wrapper });
    await waitFor(() => expect(result.current.hasUnread).toBe(true));
    expect(result.current.visible).toBe(true);
    const count = (await sent.list()).find((r) => r.path.endsWith('/unread-count'));
    expect(count?.credentials).toBe('include');
  });

  it('안 읽은 알림이 0이면 빨간 점이 없다', async () => {
    loggedIn();
    server.use(...notificationHandlers.empty);
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useNotificationBell(), { wrapper });
    await waitFor(() =>
      expect(queryClient.getQueryData(unreadNotificationCountQuery().queryKey)).toEqual({
        count: 0,
      }),
    );
    expect(result.current).toMatchObject({ visible: true, hasUnread: false });
  });

  it('벨 조회(GN-2)는 배경 재조회가 실패해도 전역 토스트를 띄우지 않는다(meta.silent)', () => {
    const { meta } = unreadNotificationCountQuery();
    const backgroundFailure = { data: { count: 1 }, fetchMeta: null };
    expect(shouldToastQueryError(new Error('x'), backgroundFailure, meta)).toBe(false);
    expect(shouldToastQueryError(new Error('x'), backgroundFailure)).toBe(true);
  });

  it('GN-2가 실패하면 빨간 점 없이 둔다(벨은 화면을 막지 않는다)', async () => {
    loggedIn();
    server.use(...notificationHandlers.countServerError);
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useNotificationBell(), { wrapper });
    await waitFor(() =>
      expect(queryClient.getQueryState(unreadNotificationCountQuery().queryKey)?.status).toBe(
        'error',
      ),
    );
    expect(result.current).toMatchObject({ visible: true, hasUnread: false });
  });

  it('refresh()는 GN-2를 다시 읽는다(메뉴·드로어 진입)', async () => {
    loggedIn();
    const sent = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(() => useNotificationBell(), { wrapper });
    await waitFor(() => expect(result.current.hasUnread).toBe(true));
    act(() => result.current.refresh());
    await waitFor(async () =>
      expect((await sent.lines()).filter((l) => l === COUNT)).toHaveLength(2),
    );
  });
});

describe('알림함 — useNotificationInbox', () => {
  it('첫 페이지(20건)를 읽고 다음 페이지는 page=1로 — 건수 UI 없이 hasNext로 끝난다', async () => {
    loggedIn();
    const sent = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(() => useNotificationInbox(), { wrapper });
    await waitFor(() => expect(result.current?.items).toHaveLength(20));
    expect(result.current.hasNext).toBe(true);
    act(() => result.current.fetchNext());
    await waitFor(() => expect(result.current.items).toHaveLength(25));
    expect(result.current.hasNext).toBe(false);
    const lists = (await sent.list()).filter((r) => `${r.method} ${r.path}` === LIST);
    expect(lists.map((r) => r.query)).toEqual([{ page: '0' }, { page: '1' }]);
  });

  it('모르는 타입·모르는 대상이 와도 깨지지 않고 기본 아이콘 + 서버 문구로 나온다', async () => {
    loggedIn();
    const { wrapper } = setup();
    const { result } = renderHook(() => useNotificationInbox(), { wrapper });
    await waitFor(() => expect(result.current?.items.length).toBeGreaterThan(0));
    const unknown = result.current.items.find((i) => i.id === NOTIFICATION_ID.unknownType)!;
    expect(unknown).toMatchObject({
      type: 'UNKNOWN',
      category: 'OTHER',
      icon: 'default',
      title: '새로운 종류의 알림',
      href: '/events/101',
    });
    const unknownTarget = result.current.items.find((i) => i.id === NOTIFICATION_ID.unknownTarget)!;
    expect(unknownTarget.href).toBeNull();
  });

  it('target.type 4종별 이동 경로가 행에 붙는다', async () => {
    loggedIn();
    const { wrapper } = setup();
    const { result } = renderHook(() => useNotificationInbox(), { wrapper });
    await waitFor(() => expect(result.current?.items.length).toBeGreaterThan(0));
    const href = (id: number) => result.current.items.find((i) => i.id === id)?.href;
    expect(href(NOTIFICATION_ID.approved)).toBe(`/orders/${NEW_APPROVED_ORDER_UUID}`);
    expect(href(NOTIFICATION_ID.hostPendingApprove)).toBe(
      '/hosting/events/101/guests?order=mock-host-order-1',
    );
    expect(href(NOTIFICATION_ID.giftReceived)).toBe('/tickets');
    expect(href(NOTIFICATION_ID.memberAdded)).toBe('/hosts/11');
    expect(href(NOTIFICATION_ID.startingSoon)).toBe('/events/101');
  });

  it('승인 알림을 누르면 PN-3 {notificationIds:[id]} → 행은 바로 읽음, 벨은 응답 unreadCount로, 티켓탭 공지 바가 풀린다', async () => {
    loggedIn();
    const { wrapper, queryClient } = setup();
    // 공지 바를 그리는 티켓탭(T-3)이 같이 떠 있다
    const { result } = renderHook(
      () => ({ ...useBoth(), notice: useQuery(newApprovedTicketsQuery()) }),
      { wrapper },
    );
    await waitFor(() => expect(result.current?.notice.data?.hasNew).toBe(true));
    await waitFor(() => expect(result.current.bell.hasUnread).toBe(true));

    const sent = recordRequests();
    act(() => result.current.inbox.open(NOTIFICATION_ID.approved));
    // 낙관: 응답 전에 행이 읽음
    await waitFor(() =>
      expect(
        result.current.inbox.items.find((i) => i.id === NOTIFICATION_ID.approved)?.isRead,
      ).toBe(true),
    );
    await waitFor(() =>
      expect(queryClient.getQueryData(unreadNotificationCountQuery().queryKey)).toEqual({
        count: 4,
      }),
    );
    await waitFor(() => expect(result.current.notice.data?.hasNew).toBe(false));
    const list = await sent.list();
    expect(list.filter((r) => `${r.method} ${r.path}` === READ).map((r) => r.body)).toEqual([
      { notificationIds: [NOTIFICATION_ID.approved] },
    ]);
    // 벨은 다시 읽지 않고 응답으로 채웠다
    expect(list.map((r) => `${r.method} ${r.path}`)).not.toContain(COUNT);
    expect(list.map((r) => `${r.method} ${r.path}`)).toContain(NOTICE);
  });

  it('알림을 누르고 바로 알림함을 떠나도(언마운트) 벨과 공지 바가 갱신된다', async () => {
    loggedIn();
    const { wrapper, queryClient } = setup();
    // 헤더의 벨 + 이동할 티켓탭의 공지 바(알림함이 사라져도 남는다)
    const shell = renderHook(
      () => ({ bell: useNotificationBell(), notice: useQuery(newApprovedTicketsQuery()) }),
      { wrapper },
    );
    const inbox = renderHook(() => useNotificationInbox(), { wrapper });
    await waitFor(() => expect(shell.result.current.notice.data?.hasNew).toBe(true));
    await waitFor(() => expect(inbox.result.current?.items.length).toBeGreaterThan(0));
    act(() => inbox.result.current.open(NOTIFICATION_ID.approved));
    inbox.unmount();
    await waitFor(() =>
      expect(queryClient.getQueryData(unreadNotificationCountQuery().queryKey)).toEqual({
        count: 4,
      }),
    );
    await waitFor(() => expect(shell.result.current.notice.data?.hasNew).toBe(false));
  });

  it('승인 알림이 아닌 알림을 읽으면 공지 바(T-3)를 다시 읽지 않는다', async () => {
    loggedIn();
    const { wrapper } = setup();
    const { result } = renderHook(() => useBoth(), { wrapper });
    await waitFor(() => expect(result.current?.bell.hasUnread).toBe(true));
    const sent = recordRequests();
    act(() => result.current.inbox.open(NOTIFICATION_ID.giftReceived));
    await waitFor(() => expect(result.current.inbox.isReading).toBe(false));
    await waitFor(async () => expect(await sent.lines()).toContain(READ));
    expect(await sent.lines()).not.toContain(NOTICE);
  });

  it('이미 읽은 알림을 누르면 PN-3을 보내지 않는다', async () => {
    loggedIn();
    const { wrapper } = setup();
    const { result } = renderHook(() => useNotificationInbox(), { wrapper });
    await waitFor(() => expect(result.current?.items.length).toBeGreaterThan(0));
    const sent = recordRequests();
    act(() => result.current.open(NOTIFICATION_ID.memberAdded));
    await new Promise((r) => setTimeout(r, 20));
    expect(await sent.lines()).toEqual([]);
  });

  it('모두 읽음은 PN-3 {readAll:true} → 불러온 행이 모두 읽음, 벨 0, 공지 바 다시 읽기', async () => {
    loggedIn();
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useBoth(), { wrapper });
    await waitFor(() => expect(result.current?.bell.hasUnread).toBe(true));
    const sent = recordRequests();
    act(() => result.current.inbox.readAll());
    await waitFor(() => expect(result.current.inbox.hasUnread).toBe(false));
    await waitFor(() => expect(result.current.bell.hasUnread).toBe(false));
    expect(queryClient.getQueryData(unreadNotificationCountQuery().queryKey)).toEqual({
      count: 0,
    });
    const list = await sent.list();
    expect(list.filter((r) => `${r.method} ${r.path}` === READ).map((r) => r.body)).toEqual([
      { readAll: true },
    ]);
  });

  it('PN-3이 실패하면 이 요청이 바꾼 행만 안 읽음으로 되돌리고 벨은 그대로', async () => {
    loggedIn();
    // 낙관 표시를 볼 수 있게 실패 응답을 늦춘다
    server.use(
      http.post('*/api/v2/me/notifications/read', async ({ request }) => {
        await delay(100);
        return errors.serverError(request);
      }),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useBoth(), { wrapper });
    await waitFor(() => expect(result.current?.bell.hasUnread).toBe(true));
    act(() => result.current.inbox.open(NOTIFICATION_ID.startingSoon));
    const row = () =>
      result.current.inbox.items.find((i) => i.id === NOTIFICATION_ID.startingSoon)!;
    await waitFor(() => expect(row().isRead).toBe(true));
    await waitFor(() => expect(row().isRead).toBe(false));
    // 원래 읽음이던 행은 그대로 읽음
    expect(
      result.current.inbox.items.find((i) => i.id === NOTIFICATION_ID.memberAdded)?.isRead,
    ).toBe(true);
    expect(queryClient.getQueryData(unreadNotificationCountQuery().queryKey)).toEqual({
      count: 5,
    });
  });

  it('다음 페이지가 실패하면 기존 행을 지우지 않고 nextPageFailed → fetchNext로 다시', async () => {
    loggedIn();
    const { wrapper } = setup();
    const { result } = renderHook(() => useNotificationInbox(), { wrapper });
    await waitFor(() => expect(result.current?.items).toHaveLength(20));
    server.use(...notificationHandlers.listServerError);
    act(() => result.current.fetchNext());
    await waitFor(() => expect(result.current.nextPageFailed).toBe(true));
    expect(result.current.items).toHaveLength(20);
    server.resetHandlers();
    act(() => result.current.fetchNext());
    await waitFor(() => expect(result.current.items).toHaveLength(25));
    expect(result.current.nextPageFailed).toBe(false);
  });

  it('알림이 없으면 빈 상태', async () => {
    loggedIn();
    server.use(...notificationHandlers.empty);
    const { wrapper } = setup();
    const { result } = renderHook(() => useNotificationInbox(), { wrapper });
    await waitFor(() => expect(result.current?.empty).toBe(true));
    expect(result.current.hasNext).toBe(false);
  });
});
