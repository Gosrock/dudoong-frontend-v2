import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hostingSets, resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { server } from '@/api/__mocks__/server';
import { shouldToastQueryError } from '@/api/query-client';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { HOSTING_KEYWORD_DEBOUNCE_MS, HOSTS_EMPTY_TITLE } from './hosting-home';
import { useHostingHome } from './useHostingHome';

/** Next의 `useSearchParams`를 흉내 낸다 — `replaceState`·`popstate` 때 다시 읽는다(useEventList.test와 같다) */
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
let restoreFetch: () => void;
beforeEach(() => {
  resetHostingStore();
  restoreFetch = installLoggedInFetch();
  vi.spyOn(window.history, 'replaceState').mockImplementation((...args) => {
    realReplace(...args);
    urlListeners.forEach((cb) => cb());
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  restoreFetch();
  realReplace(null, '', '/');
});

/** `/hosting{qs}`로 화면을 연다 */
function open(qs = '') {
  realReplace(null, '', `/hosting${qs}`);
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useHostingHome(), { wrapper }), queryClient };
}

const reads = async (sent: ReturnType<typeof recordRequests>) =>
  (await sent.list()).map((r) => `${r.path}?${new URLSearchParams(r.query).toString()}`);

describe('공연준비 홈 — 탭(GH-1 / GE-1)', () => {
  it('기본은 공연 탭: GE-1만 쿠키와 함께 첫 페이지를 읽고, GH-1은 부르지 않는다', async () => {
    const sent = recordRequests();
    const { result } = open();
    expect(result.current.tab).toBe('events');
    await waitFor(() => expect(result.current.events.status).toBe('success'));
    expect(result.current.events.items.map((e) => e.eventId)).toEqual([140, 103, 101, 90]);
    expect(await sent.list()).toMatchObject([
      { path: '/api/v2/me/events', query: { page: '0' }, credentials: 'include' },
    ]);
    expect(result.current.hosts.status).toBe('pending');
  });

  it('공연 카드 ⋮ 삭제(P11): 준비중 공연 + 매니저 이상만 canDelete', async () => {
    const { result } = open();
    await waitFor(() => expect(result.current.events.status).toBe('success'));
    expect(result.current.events.items.map((e) => [e.eventId, e.status, e.canDelete])).toEqual([
      [140, 'PREPARING', true],
      [103, 'OPEN', false],
      [101, 'OPEN', false],
      [90, 'CLOSED', false],
    ]);
  });

  it('호스트 탭으로 바꾸면 주소에 ?tab=hosts가 남고 GH-1을 읽는다 — 카드에 myRole·eventCount·호스트 홈 주소', async () => {
    const { result } = open();
    await waitFor(() => expect(result.current.events.status).toBe('success'));
    const sent = recordRequests();
    act(() => result.current.setTab('hosts'));
    expect(window.location.search).toBe('?tab=hosts');
    await waitFor(() => expect(result.current.hosts.status).toBe('success'));
    expect(result.current.tab).toBe('hosts');
    expect(result.current.hosts.items).toEqual([
      expect.objectContaining({ hostId: 11, myRole: 'MASTER', eventCount: 4, href: '/hosts/11' }),
    ]);
    expect(await reads(sent)).toEqual(['/api/v2/me/hosts?page=0']);
  });

  it('주소가 ?tab=hosts면 호스트 탭으로 열린다(호스트를 만든 뒤 돌아오는 곳)', async () => {
    const sent = recordRequests();
    const { result } = open('?tab=hosts');
    await waitFor(() => expect(result.current.hosts.status).toBe('success'));
    expect(await reads(sent)).toEqual(['/api/v2/me/hosts?page=0']);
  });

  it('카드의 myRole은 호스트마다 다르다(고스락 마스터 · 소음공작소 일반 멤버)', async () => {
    server.use(...hostingSets.mixedRoles);
    const { result } = open();
    await waitFor(() => expect(result.current.events.status).toBe('success'));
    const roleOf = (hostId: number) =>
      new Set(result.current.events.items.filter((e) => e.hostId === hostId).map((e) => e.myRole));
    expect(roleOf(11)).toEqual(new Set(['MASTER']));
    expect(roleOf(12)).toEqual(new Set(['GUEST']));
    expect(result.current.events.items[0]?.href).toMatch(/^\/hosting\/events\/\d+$/);

    act(() => result.current.setTab('hosts'));
    await waitFor(() => expect(result.current.hosts.status).toBe('success'));
    expect(result.current.hosts.items.map((h) => [h.hostId, h.myRole])).toEqual([
      [11, 'MASTER'],
      [12, 'GUEST'],
    ]);
  });
});

describe('공연준비 홈 — 검색', () => {
  it('입력 뒤 300ms에 지금 탭 목록을 keyword로 새로 읽고(첫 페이지부터), 탭을 바꿔도 검색어가 남는다', async () => {
    const { result } = open();
    await waitFor(() => expect(result.current.events.status).toBe('success'));
    const sent = recordRequests();
    act(() => result.current.setKeywordInput('정기공연'));
    expect(result.current.keyword).toBe('');
    await act(() => new Promise((r) => setTimeout(r, HOSTING_KEYWORD_DEBOUNCE_MS + 100)));
    expect(result.current.keyword).toBe('정기공연');
    await waitFor(() => expect(result.current.events.items).toHaveLength(2));

    act(() => result.current.setTab('hosts'));
    await waitFor(() => expect(result.current.hosts.status).toBe('empty'));
    expect(result.current.hosts.emptyKind).toBe('search');
    expect(await reads(sent)).toEqual([
      '/api/v2/me/events?keyword=%EC%A0%95%EA%B8%B0%EA%B3%B5%EC%97%B0&page=0',
      '/api/v2/me/hosts?keyword=%EC%A0%95%EA%B8%B0%EA%B3%B5%EC%97%B0&page=0',
    ]);
  });

  it('검색칸은 50자에서 막고, submitKeyword는 기다리지 않고 바로 적용한다', async () => {
    const { result } = open('?tab=hosts');
    await waitFor(() => expect(result.current.hosts.status).toBe('success'));
    act(() => result.current.setKeywordInput(`고스${'가'.repeat(60)}`));
    expect(result.current.keywordInput).toHaveLength(50);
    act(() => result.current.setKeywordInput(' 고스 '));
    act(() => result.current.submitKeyword());
    expect(result.current.keyword).toBe('고스');
    await waitFor(() => expect(result.current.hosts.items.map((h) => h.name)).toEqual(['고스락']));
  });
});

describe('공연준비 홈 — 빈 상태 · 무한 스크롤 · 실패', () => {
  it('소속 호스트가 없으면 호스트 탭은 "등록한 것 없음" 빈 상태(검색 결과 없음과 구분)', async () => {
    server.use(...hostingSets.noMembership);
    const { result } = open('?tab=hosts');
    await waitFor(() => expect(result.current.hosts.status).toBe('empty'));
    expect(result.current.hosts.emptyKind).toBe('none');
    expect(HOSTS_EMPTY_TITLE).toBe('두둥! 등록한 호스트가 없어요.');
  });

  it('공연이 없으면 공연 탭 빈 상태', async () => {
    server.use(...hostingSets.noEvents);
    const { result } = open();
    await waitFor(() => expect(result.current.events.status).toBe('empty'));
    expect(result.current.events.emptyKind).toBe('none');
  });

  it('호스트 24개: 10개씩 page=1·2로 이어 읽고 hasNext가 false면 끝난다', async () => {
    server.use(...hostingSets.manyHosts);
    const { result } = open('?tab=hosts');
    await waitFor(() => expect(result.current.hosts.items).toHaveLength(10));
    const sent = recordRequests();
    act(() => result.current.hosts.loadMore());
    await waitFor(() => expect(result.current.hosts.items).toHaveLength(20));
    act(() => result.current.hosts.loadMore());
    await waitFor(() => expect(result.current.hosts.items).toHaveLength(24));
    expect(result.current.hosts.hasNextPage).toBe(false);
    expect(await reads(sent)).toEqual(['/api/v2/me/hosts?page=1', '/api/v2/me/hosts?page=2']);
    expect(new Set(result.current.hosts.items.map((h) => h.myRole))).toEqual(
      new Set(['MASTER', 'GUEST', 'MANAGER']),
    );
  });

  it('다음 페이지가 실패하면 기존 행을 두고 nextPageError → retry로 그 페이지를 다시, 전역 토스트 없음', async () => {
    server.use(...hostingSets.manyHosts);
    const { result, queryClient } = open('?tab=hosts');
    await waitFor(() => expect(result.current.hosts.items).toHaveLength(10));
    server.use(...hostingSets.nextPageError);
    act(() => result.current.hosts.loadMore());
    await waitFor(() => expect(result.current.hosts.nextPageError).toBe(true));
    expect(result.current.hosts.items).toHaveLength(10);
    expect(result.current.hosts.status).toBe('success');
    const query = queryClient.getQueryCache().getAll()[0]!;
    expect(shouldToastQueryError(query.state.error, query.state, query.meta)).toBe(false);
    server.resetHandlers(...hostingSets.manyHosts);
    act(() => result.current.hosts.retry());
    await waitFor(() => expect(result.current.hosts.items).toHaveLength(20));
  });

  it('첫 페이지가 실패하면 error → retry로 다시 읽는다', async () => {
    server.use(...hostingSets.listServerError);
    const { result } = open();
    await waitFor(() => expect(result.current.events.status).toBe('error'));
    server.resetHandlers();
    act(() => result.current.events.retry());
    await waitFor(() => expect(result.current.events.status).toBe('success'));
  });
});
