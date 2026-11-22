import { QueryClientProvider, useQuery, useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http } from 'msw';
import { type ReactNode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  NEW_APPROVED_ORDER_UUID,
  resetTicketStore,
  setUnreadRefused,
} from '@/api/__mocks__/fixtures/my-ticket';
import {
  markNotificationUnread,
  NOTIFICATION_ID,
  resetNotificationStore,
} from '@/api/__mocks__/fixtures/notification';
import { notificationHandlers } from '@/api/__mocks__/notification.handlers';
import { errors } from '@/api/__mocks__/respond';
import { server } from '@/api/__mocks__/server';
import { newApprovedTicketsQuery } from '@/api/my-ticket/queries';
import { notificationsQuery, unreadNotificationCountQuery } from '@/api/notification/queries';
import { shouldToastQueryError } from '@/api/query-client';
import { errorToast } from '@/test/error-toast';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { useNotificationBell } from './useNotificationBell';
import { useNotificationInbox } from './useNotificationInbox';
import { useReadNotifications } from './useReadNotifications';

/** Next의 `useSearchParams`를 흉내 낸다 — `replaceState` 때 다시 읽는다(useHostingHome.test와 같다) */
const urlListeners = vi.hoisted(() => new Set<() => void>());
vi.mock('next/navigation', async () => {
  const { useMemo, useSyncExternalStore } = await import('react');
  const subscribe = (cb: () => void) => {
    urlListeners.add(cb);
    return () => urlListeners.delete(cb);
  };
  return {
    useSearchParams: () => {
      const search = useSyncExternalStore(subscribe, () => window.location.search);
      return useMemo(() => new URLSearchParams(search), [search]);
    },
  };
});

const realReplace = window.history.replaceState.bind(window.history);
let restore: (() => void) | null = null;
beforeEach(() => {
  resetTicketStore();
  resetNotificationStore();
  realReplace(null, '', '/mypage/notifications');
  vi.spyOn(window.history, 'replaceState').mockImplementation((...args) => {
    realReplace(...args);
    urlListeners.forEach((cb) => cb());
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  restore?.();
  restore = null;
  realReplace(null, '', '/');
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

/** 알림함 목록 캐시를 보면서 읽음 훅을 쓴다(알림함 화면 없이 — 창을 열면 읽는 동작과 떼어 본다) */
function useReader() {
  const list = useSuspenseInfiniteQuery(notificationsQuery());
  const rows = list.data.pages.flatMap((p) => p.content);
  return {
    ...useReadNotifications(),
    bell: useNotificationBell(),
    isRead: (id: number) => rows.find((n) => n.notificationId === id)?.isRead,
  };
}

/** 관객 창의 안 읽은 알림(최신 순) — 픽스처: 승인 · 곧 시작 · 선물 도착 · 모르는 타입 */
const AUDIENCE_UNREAD = [
  NOTIFICATION_ID.approved,
  NOTIFICATION_ID.startingSoon,
  NOTIFICATION_ID.giftReceived,
  NOTIFICATION_ID.unknownType,
];

describe('읽음 — useReadNotifications', () => {
  it('한 건 읽음은 PN-3 {notificationIds:[id]} → 행은 바로 읽음, 벨은 응답 unreadCount로, 승인 알림이면 티켓탭 공지 바가 풀린다', async () => {
    loggedIn();
    const { wrapper, queryClient } = setup();
    // 공지 바를 그리는 티켓탭(T-3)이 같이 떠 있다
    const { result } = renderHook(
      () => ({ ...useReader(), notice: useQuery(newApprovedTicketsQuery()) }),
      { wrapper },
    );
    await waitFor(() => expect(result.current?.notice.data?.hasNew).toBe(true));
    await waitFor(() => expect(result.current.bell.hasUnread).toBe(true));

    const sent = recordRequests();
    act(() => result.current.read(NOTIFICATION_ID.approved));
    // 낙관: 응답 전에 행이 읽음
    await waitFor(() => expect(result.current.isRead(NOTIFICATION_ID.approved)).toBe(true));
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

  it('읽고 바로 화면을 떠나도(언마운트) 벨과 공지 바가 갱신된다', async () => {
    loggedIn();
    const { wrapper, queryClient } = setup();
    // 헤더의 벨 + 이동할 티켓탭의 공지 바(알림함이 사라져도 남는다)
    const shell = renderHook(
      () => ({ bell: useNotificationBell(), notice: useQuery(newApprovedTicketsQuery()) }),
      { wrapper },
    );
    const reader = renderHook(() => useReader(), { wrapper });
    await waitFor(() => expect(shell.result.current.notice.data?.hasNew).toBe(true));
    await waitFor(() =>
      expect(reader.result.current?.isRead(NOTIFICATION_ID.approved)).toBe(false),
    );
    act(() => reader.result.current.read(NOTIFICATION_ID.approved));
    reader.unmount();
    await waitFor(() =>
      expect(queryClient.getQueryData(unreadNotificationCountQuery().queryKey)).toEqual({
        count: 4,
      }),
    );
    await waitFor(() => expect(shell.result.current.notice.data?.hasNew).toBe(false));
  });

  it('거절 알림을 읽으면 티켓탭 공지 바(T-3)를 다시 읽어 거절 띠가 풀린다(#208)', async () => {
    setUnreadRefused(['mock-order-tickets-c']);
    markNotificationUnread(NOTIFICATION_ID.refused);
    loggedIn();
    const { wrapper } = setup();
    const { result } = renderHook(
      () => ({ ...useReader(), notice: useQuery(newApprovedTicketsQuery()) }),
      { wrapper },
    );
    await waitFor(() =>
      expect(result.current?.notice.data?.refusedOrderUuids).toEqual(['mock-order-tickets-c']),
    );
    await waitFor(() => expect(result.current.isRead(NOTIFICATION_ID.refused)).toBe(false));

    const sent = recordRequests();
    act(() => result.current.read(NOTIFICATION_ID.refused));
    await waitFor(() => expect(result.current.notice.data?.refusedOrderUuids).toEqual([]));
    const lines = await sent.lines();
    expect(lines).toContain(READ);
    expect(lines).toContain(NOTICE);
    // 승인 띠는 그대로(거절 알림은 승인 알림을 읽지 않는다)
    expect(result.current.notice.data?.hasNew).toBe(true);
  });

  it('승인·거절 알림이 아닌 알림을 읽으면 공지 바(T-3)를 다시 읽지 않는다', async () => {
    loggedIn();
    const { wrapper } = setup();
    const { result } = renderHook(() => useReader(), { wrapper });
    await waitFor(() => expect(result.current?.bell.hasUnread).toBe(true));
    const sent = recordRequests();
    act(() => result.current.read(NOTIFICATION_ID.giftReceived));
    await waitFor(() => expect(result.current.isPending).toBe(false));
    await waitFor(async () => expect(await sent.lines()).toContain(READ));
    expect(await sent.lines()).not.toContain(NOTICE);
  });

  it('PN-3이 실패하면 이 요청이 바꾼 행만 안 읽음으로 되돌리고 벨은 그대로, 공용 토스트', async () => {
    loggedIn();
    // 낙관 표시를 볼 수 있게 실패 응답을 늦춘다
    server.use(
      http.post('*/api/v2/me/notifications/read', async ({ request }) => {
        await delay(100);
        return errors.serverError(request);
      }),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useReader(), { wrapper });
    await waitFor(() => expect(result.current?.bell.hasUnread).toBe(true));
    act(() => result.current.read(NOTIFICATION_ID.startingSoon));
    await waitFor(() => expect(result.current.isRead(NOTIFICATION_ID.startingSoon)).toBe(true));
    await waitFor(() => expect(result.current.isRead(NOTIFICATION_ID.startingSoon)).toBe(false));
    // 원래 읽음이던 행은 그대로 읽음
    expect(result.current.isRead(NOTIFICATION_ID.memberAdded)).toBe(true);
    expect(queryClient.getQueryData(unreadNotificationCountQuery().queryKey)).toEqual({
      count: 5,
    });
    await waitFor(() =>
      expect(errorToast).toHaveBeenCalledWith(
        '서버 오류. 관리자에게 문의 부탁드립니다.',
        'mutation:GLOBAL_500_1',
      ),
    );
  });

  it('모두 읽음은 PN-3 {readAll:true} → 불러온 행이 모두 읽음, 벨 0', async () => {
    loggedIn();
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useReader(), { wrapper });
    await waitFor(() => expect(result.current?.bell.hasUnread).toBe(true));
    const sent = recordRequests();
    act(() => result.current.readAll());
    await waitFor(() =>
      expect(result.current.isRead(NOTIFICATION_ID.hostPendingApprove)).toBe(true),
    );
    await waitFor(() => expect(result.current.bell.hasUnread).toBe(false));
    expect(queryClient.getQueryData(unreadNotificationCountQuery().queryKey)).toEqual({
      count: 0,
    });
    const list = await sent.list();
    expect(list.filter((r) => `${r.method} ${r.path}` === READ).map((r) => r.body)).toEqual([
      { readAll: true },
    ]);
  });

  it('창에서 본 알림(readSeen)은 100개씩 나눠 보내고, 실패해도 토스트 없이 행만 되돌린다', async () => {
    loggedIn();
    server.use(
      http.post('*/api/v2/me/notifications/read', async ({ request }) => {
        await delay(50);
        return errors.serverError(request);
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useReader(), { wrapper });
    await waitFor(() => expect(result.current?.bell.hasUnread).toBe(true));
    const sent = recordRequests();
    const many = Array.from({ length: 150 }, (_, i) => 1000 + i);
    act(() => result.current.readSeen([NOTIFICATION_ID.approved, ...many]));
    await waitFor(() => expect(result.current.isRead(NOTIFICATION_ID.approved)).toBe(true));
    await waitFor(() => expect(result.current.isRead(NOTIFICATION_ID.approved)).toBe(false));
    const bodies = (await sent.list())
      .filter((r) => `${r.method} ${r.path}` === READ)
      .map((r) => (r.body as { notificationIds: number[] }).notificationIds.length);
    expect(bodies).toEqual([100, 51]);
    await new Promise((r) => setTimeout(r, 20));
    expect(errorToast).not.toHaveBeenCalled();
  });
});

describe('알림함 — useNotificationInbox(GUI #375 · #376)', () => {
  it('관객 창(기본)은 호스트가 받는 알림 5종을 빼고 보인다. 다음 페이지는 page=1로 이어 읽는다', async () => {
    loggedIn();
    const sent = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(() => useNotificationInbox(), { wrapper });
    await waitFor(() => expect(result.current?.items.length).toBeGreaterThan(0));
    expect(result.current.tab).toBe('audience');
    // 첫 페이지 20건 중 호스트 창 5건(새 주문 · 멤버 추가 · 환불 요청 · 주문자 취소 · 환불 계좌 변경)을 뺀 15건
    expect(result.current.items).toHaveLength(15);
    expect(result.current.items.every((i) => i.tab === 'audience')).toBe(true);
    expect(result.current.hasNext).toBe(true);
    act(() => result.current.fetchNext());
    await waitFor(() => expect(result.current.items).toHaveLength(20));
    expect(result.current.hasNext).toBe(false);
    const lists = (await sent.list()).filter((r) => `${r.method} ${r.path}` === LIST);
    expect(lists.map((r) => r.query)).toEqual([{ page: '0' }, { page: '1' }]);
  });

  it('?tab=host면 호스트 창 — 호스트가 받는 주문 알림 4종 + 멤버 추가, 아이콘은 주문 상세 · 사람', async () => {
    loggedIn();
    realReplace(null, '', '/mypage/notifications?tab=host');
    const { wrapper } = setup();
    const { result } = renderHook(() => useNotificationInbox(), { wrapper });
    await waitFor(() => expect(result.current?.items.length).toBeGreaterThan(0));
    expect(result.current.tab).toBe('host');
    expect(result.current.items.map((i) => [i.type, i.label, i.icon])).toEqual([
      ['ORDER_PENDING_APPROVE', '신규 주문 알림', 'order-detail'],
      ['HOST_MEMBER_ADDED', '호스트 멤버 추가', 'people'],
      ['ORDER_REFUND_REQUESTED', '주문 취소 요청', 'order-detail'],
      ['ORDER_CANCELED_BY_USER', '주문 취소 알림', 'order-detail'],
      ['REFUND_ACCOUNT_CHANGED', '환불 계좌 변경', 'order-detail'],
    ]);
  });

  it('창을 열면 그 창의 안 읽은 알림만 PN-3 notificationIds로 읽고, 이번 방문 동안은 새 알림으로 둔다. 다른 창에는 빨간 점', async () => {
    loggedIn();
    const sent = recordRequests();
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(
      () => ({ ...useBoth(), notice: useQuery(newApprovedTicketsQuery()) }),
      { wrapper },
    );
    await waitFor(() =>
      expect(queryClient.getQueryData(unreadNotificationCountQuery().queryKey)).toEqual({
        count: 1,
      }),
    );
    const reads = (await sent.list()).filter((r) => `${r.method} ${r.path}` === READ);
    expect(reads.map((r) => r.body)).toEqual([{ notificationIds: AUDIENCE_UNREAD }]);
    const item = (id: number) => result.current.inbox.items.find((i) => i.id === id)!;
    // 읽음이 됐지만 진하게(새 알림) 남는다 — 원래 읽은 행은 흐리게
    expect(item(NOTIFICATION_ID.approved)).toMatchObject({ isRead: true, isNew: true });
    expect(item(NOTIFICATION_ID.unknownTarget)).toMatchObject({ isRead: true, isNew: false });
    // 승인 알림을 읽어 티켓탭 공지 바가 풀린다
    await waitFor(() => expect(result.current.notice.data?.hasNew).toBe(false));
    // 호스트 창의 새 주문 알림은 아직 안 읽음 → 호스트 탭 빨간 점, 벨도 빨간 점
    expect(result.current.inbox.tabs).toEqual([
      { key: 'audience', label: '관객', hasUnread: false },
      { key: 'host', label: '호스트', hasUnread: true },
    ]);
    expect(result.current.bell.hasUnread).toBe(true);
  });

  it('호스트 창으로 바꾸면 주소 ?tab=host, 그 창의 새 알림을 읽어 벨이 꺼진다. 같은 알림을 두 번 보내지 않는다', async () => {
    loggedIn();
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useBoth(), { wrapper });
    await waitFor(() =>
      expect(queryClient.getQueryData(unreadNotificationCountQuery().queryKey)).toEqual({
        count: 1,
      }),
    );
    const sent = recordRequests();
    act(() => result.current.inbox.setTab('host'));
    expect(window.location.search).toBe('?tab=host');
    await waitFor(() => expect(result.current.inbox.tab).toBe('host'));
    await waitFor(() => expect(result.current.bell.hasUnread).toBe(false));
    expect(
      result.current.inbox.items.find((i) => i.id === NOTIFICATION_ID.hostPendingApprove),
    ).toMatchObject({ isRead: true, isNew: true });
    act(() => result.current.inbox.setTab('audience'));
    expect(window.location.search).toBe('');
    await new Promise((r) => setTimeout(r, 20));
    const reads = (await sent.list()).filter((r) => `${r.method} ${r.path}` === READ);
    expect(reads.map((r) => r.body)).toEqual([
      { notificationIds: [NOTIFICATION_ID.hostPendingApprove] },
    ]);
  });

  it('모르는 타입 · 모르는 대상이 와도 깨지지 않고 관객 창에 기본 아이콘 + 이름 "알림" + 서버 본문으로 나온다', async () => {
    loggedIn();
    const { wrapper } = setup();
    const { result } = renderHook(() => useNotificationInbox(), { wrapper });
    await waitFor(() => expect(result.current?.items.length).toBeGreaterThan(0));
    const unknown = result.current.items.find((i) => i.id === NOTIFICATION_ID.unknownType)!;
    expect(unknown).toMatchObject({
      type: 'UNKNOWN',
      tab: 'audience',
      label: '알림',
      icon: 'default',
      href: '/events/101',
    });
    expect(unknown.text).not.toBe('');
    const unknownTarget = result.current.items.find((i) => i.id === NOTIFICATION_ID.unknownTarget)!;
    expect(unknownTarget.href).toBeNull();
  });

  it('target.type 4종별 이동 경로가 행에 붙는다', async () => {
    loggedIn();
    const { wrapper } = setup();
    const audience = renderHook(() => useNotificationInbox(), { wrapper });
    await waitFor(() => expect(audience.result.current?.items.length).toBeGreaterThan(0));
    const href = (id: number) => audience.result.current.items.find((i) => i.id === id)?.href;
    expect(href(NOTIFICATION_ID.approved)).toBe(`/orders/${NEW_APPROVED_ORDER_UUID}`);
    expect(href(NOTIFICATION_ID.giftReceived)).toBe('/tickets');
    expect(href(NOTIFICATION_ID.startingSoon)).toBe('/events/101');
    act(() => audience.result.current.setTab('host'));
    await waitFor(() => expect(audience.result.current.tab).toBe('host'));
    expect(href(NOTIFICATION_ID.hostPendingApprove)).toBe(
      '/hosting/events/101/guests?order=mock-host-order-1',
    );
    expect(href(NOTIFICATION_ID.memberAdded)).toBe('/hosts/11');
  });

  it('이미 읽은 알림을 누르면 PN-3을 보내지 않는다', async () => {
    loggedIn();
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useNotificationInbox(), { wrapper });
    // 창을 열어 읽는 요청이 끝날 때까지
    await waitFor(() =>
      expect(queryClient.getQueryData(unreadNotificationCountQuery().queryKey)).toEqual({
        count: 1,
      }),
    );
    const sent = recordRequests();
    act(() => result.current.open(NOTIFICATION_ID.unknownTarget));
    act(() => result.current.open(NOTIFICATION_ID.approved));
    await new Promise((r) => setTimeout(r, 20));
    expect(await sent.lines()).toEqual([]);
  });

  it('다음 페이지가 실패하면 기존 행을 지우지 않고 nextPageFailed → fetchNext로 다시', async () => {
    loggedIn();
    const { wrapper } = setup();
    const { result } = renderHook(() => useNotificationInbox(), { wrapper });
    await waitFor(() => expect(result.current?.items).toHaveLength(15));
    server.use(...notificationHandlers.listServerError);
    act(() => result.current.fetchNext());
    await waitFor(() => expect(result.current.nextPageFailed).toBe(true));
    expect(result.current.items).toHaveLength(15);
    server.resetHandlers();
    act(() => result.current.fetchNext());
    await waitFor(() => expect(result.current.items).toHaveLength(20));
    expect(result.current.nextPageFailed).toBe(false);
  });

  it('알림이 없으면 빈 상태, 정렬은 최신순 고정', async () => {
    loggedIn();
    server.use(...notificationHandlers.empty);
    const { wrapper } = setup();
    const { result } = renderHook(() => useNotificationInbox(), { wrapper });
    await waitFor(() => expect(result.current?.empty).toBe(true));
    expect(result.current.hasNext).toBe(false);
    expect(result.current.sortLabel).toBe('최신순');
  });
});
