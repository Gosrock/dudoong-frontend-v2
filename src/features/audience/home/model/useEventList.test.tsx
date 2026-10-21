import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { eventBrowseSets } from '@/api/__mocks__/event.handlers';
import { ok } from '@/api/__mocks__/respond';
import { server } from '@/api/__mocks__/server';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { KEYWORD_DEBOUNCE_MS } from './event-list-filter';
import { useEventList } from './useEventList';

/**
 * Next의 `useSearchParams`를 흉내 낸다 — 앱에서는 `history.replaceState`가 라우터와 맞물려 새 값이 오고,
 * 여기서는 `replaceState`·`popstate` 때 다시 읽게 한다.
 */
const urlListeners = vi.hoisted(() => new Set<() => void>());
vi.mock('next/navigation', async () => {
  const { useMemo, useSyncExternalStore } = await import('react');
  const subscribe = (cb: () => void) => {
    urlListeners.add(cb);
    window.addEventListener('popstate', cb);
    return () => {
      urlListeners.delete(cb);
      window.removeEventListener('popstate', cb);
    };
  };
  return {
    useSearchParams: () => {
      const search = useSyncExternalStore(subscribe, () => window.location.search);
      return useMemo(() => new URLSearchParams(search), [search]);
    },
  };
});

const realReplace = window.history.replaceState.bind(window.history);
beforeEach(() => {
  vi.spyOn(window.history, 'replaceState').mockImplementation((...args) => {
    realReplace(...args);
    urlListeners.forEach((cb) => cb());
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  realReplace(null, '', '/');
});

const search = () => decodeURIComponent(window.location.search);

/** 주소 `/events{qs}`로 화면을 연다 */
function open(qs = '') {
  realReplace(null, '', `/events${qs}`);
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useEventList(), { wrapper }), queryClient };
}

async function loaded(qs?: string) {
  const view = open(qs);
  await waitFor(() => expect(view.result.current.events.status).not.toBe('pending'));
  await waitFor(() => expect(view.result.current.tags.status).toBe('success'));
  return view;
}

const listRequests = async (sent: ReturnType<typeof recordRequests>) =>
  (await sent.list()).filter((r) => r.path === '/api/v2/events');

describe('공연 리스트 — 조회', () => {
  it('필터 없이 열면 GP-2 첫 페이지와 GE-11을 쿠키 없이 읽는다(정렬 파라미터 없음 = 공연임박순)', async () => {
    const sent = recordRequests();
    const { result } = await loaded();
    const list = await sent.list();
    expect(list.map((r) => `${r.method} ${r.path} ${r.credentials}`).sort()).toEqual([
      'GET /api/v2/events omit',
      'GET /api/v2/tags omit',
    ]);
    expect(list.find((r) => r.path === '/api/v2/events')?.query).toEqual({ page: '0' });
    expect(result.current.events.status).toBe('success');
    expect(result.current.tags.groups.map((g) => g.label)).toEqual([
      '공연구분',
      '장르',
      '장소',
      '팀',
    ]);
  });

  it('주소의 필터(검색어·태그·지난공연)로 첫 요청을 보낸다 — 새로고침·뒤로가기 복구', async () => {
    const sent = recordRequests();
    const { result } = await loaded('?keyword=고스락&tagIds=2,1,2&includePast=true');
    expect(result.current.filter).toEqual({ keyword: '고스락', tagIds: [1, 2], includePast: true });
    expect(result.current.keywordInput).toBe('고스락');
    expect(result.current.tags.selectedCount).toBe(2);
    expect((await listRequests(sent)).map((r) => r.query)).toEqual([
      { keyword: '고스락', tagIds: '1,2', includePast: 'true', page: '0' },
    ]);
  });

  it('결과가 없으면 empty', async () => {
    server.use(...eventBrowseSets.listEmpty);
    const { result } = await loaded();
    expect(result.current.events.status).toBe('empty');
  });

  it('첫 페이지가 5xx면 error이고 다시 시도로 읽는다', async () => {
    server.use(...eventBrowseSets.listServerError);
    const { result } = await loaded();
    expect(result.current.events.status).toBe('error');
    server.resetHandlers();
    act(() => result.current.events.retry());
    await waitFor(() => expect(result.current.events.status).toBe('success'));
  });

  it('GE-11이 실패해도 목록은 보이고 태그 패널만 error다', async () => {
    server.use(...eventBrowseSets.tagsServerError);
    const view = open();
    await waitFor(() => expect(view.result.current.tags.status).toBe('error'));
    await waitFor(() => expect(view.result.current.events.status).toBe('success'));
  });
});

describe('공연 리스트 — 무한 스크롤', () => {
  it('다음 페이지를 이어 읽고 페이지 사이 중복은 한 번만 남긴다', async () => {
    const sent = recordRequests();
    const { result } = await loaded();
    expect(result.current.events.hasNextPage).toBe(true);
    const first = result.current.events.items.length;
    act(() => result.current.events.loadMore());
    act(() => result.current.events.loadMore()); // 읽는 중 중복 호출은 무시
    await waitFor(() => expect(result.current.events.items.length).toBeGreaterThan(first));
    expect((await listRequests(sent)).map((r) => r.query.page)).toEqual(['0', '1']);
    const ids = result.current.events.items.map((e) => e.eventId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('페이지 사이에 끼어든 공연으로 같은 id가 다시 오면 렌더 목록에서 뺀다', async () => {
    server.use(
      http.get('*/api/v2/events', ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'));
        const item = (eventId: number) => ({
          eventId,
          name: `공연 ${eventId}`,
          posterImageUrl: null,
          startAt: null,
          endAt: null,
          placeName: null,
          hostName: null,
          tags: [],
          displayStatus: 'UPCOMING',
        });
        const content = page === 0 ? [item(1), item(2)] : [item(2), item(3)];
        return ok({ content, page, size: 2, totalElements: 4, totalPages: 2, hasNext: page === 0 });
      }),
    );
    const { result } = await loaded();
    act(() => result.current.events.loadMore());
    await waitFor(() => expect(result.current.events.hasNextPage).toBe(false));
    expect(result.current.events.items.map((e) => e.eventId)).toEqual([1, 2, 3]);
  });

  it('다음 페이지가 실패해도 기존 행은 남고 하단 재시도로 이어 읽는다', async () => {
    server.use(...eventBrowseSets.listNextPageError);
    const { result } = await loaded();
    const first = result.current.events.items.length;
    act(() => result.current.events.loadMore());
    await waitFor(() => expect(result.current.events.nextPageError).toBe(true));
    expect(result.current.events.items).toHaveLength(first);
    expect(result.current.events.status).toBe('success');
    server.resetHandlers();
    act(() => result.current.events.retry());
    await waitFor(() => expect(result.current.events.items.length).toBeGreaterThan(first));
  });
});

describe('공연 리스트 — 필터와 주소', () => {
  it('칩을 누르면 바로 주소에 반영(replace — 기록이 늘지 않음)되고 새 키의 첫 페이지부터 읽는다', async () => {
    const { result } = await loaded();
    const sent = recordRequests();
    const before = window.history.length;
    act(() => result.current.toggleTag(2));
    expect(search()).toBe('?tagIds=2');
    act(() => result.current.toggleTag(1));
    expect(search()).toBe('?tagIds=1,2');
    expect(window.history.length).toBe(before);
    await waitFor(() => expect(result.current.filter.tagIds).toEqual([1, 2]));
    await waitFor(() => expect(result.current.events.status).not.toBe('pending'));
    const queries = (await listRequests(sent)).map((r) => r.query);
    expect(queries.at(-1)).toEqual({ tagIds: '1,2', page: '0' });
  });

  it('태그 순서만 다른 필터는 같은 캐시를 쓴다', async () => {
    const { queryClient } = await loaded('?tagIds=2,1');
    const keys = queryClient
      .getQueryCache()
      .findAll({ queryKey: ['events', 'infinite'] })
      .map((q) => q.queryKey);
    expect(keys).toEqual([['events', 'infinite', { tagIds: [1, 2] }]]);
  });

  it('초기화는 태그만 비우고 검색어·지난공연은 둔다', async () => {
    const { result } = await loaded('?keyword=락&tagIds=1,2&includePast=true');
    act(() => result.current.resetTags());
    expect(search()).toBe('?keyword=락&includePast=true');
  });

  it('지난공연 토글이 주소에 반영된다', async () => {
    const { result } = await loaded();
    act(() => result.current.setIncludePast(true));
    expect(search()).toBe('?includePast=true');
    act(() => result.current.setIncludePast(false));
    expect(search()).toBe('');
  });

  it('필터와 무관한 쿼리는 남긴다', async () => {
    const { result } = await loaded('?utm_source=kakao');
    act(() => result.current.toggleTag(7));
    expect(search()).toBe('?utm_source=kakao&tagIds=7');
  });

  it('검색어는 입력 뒤 잠시 기다렸다 주소에 반영하고, 그 사이 입력은 요청하지 않는다', async () => {
    const { result } = await loaded();
    const sent = recordRequests();
    act(() => result.current.setKeywordInput('고'));
    act(() => result.current.setKeywordInput('고스'));
    act(() => result.current.setKeywordInput('고스락 '));
    expect(search()).toBe('');
    await new Promise((r) => setTimeout(r, KEYWORD_DEBOUNCE_MS + 100));
    expect(search()).toBe('?keyword=고스락');
    // 치는 중인 끝 공백은 입력칸에 남는다
    expect(result.current.keywordInput).toBe('고스락 ');
    await waitFor(() => expect(result.current.events.status).not.toBe('pending'));
    expect((await listRequests(sent)).map((r) => r.query.keyword)).toEqual(['고스락']);
  });

  it('엔터(submitKeyword)는 기다리지 않고 바로 반영한다', async () => {
    const { result } = await loaded();
    act(() => result.current.setKeywordInput('소음'));
    act(() => result.current.submitKeyword());
    expect(search()).toBe('?keyword=소음');
  });

  it('검색어는 50자에서 입력이 막힌다', async () => {
    const { result } = await loaded();
    act(() => result.current.setKeywordInput('가'.repeat(55)));
    expect(result.current.keywordInput).toHaveLength(50);
  });

  it('뒤로가기로 주소가 바뀌면 입력칸과 필터가 주소를 따른다', async () => {
    const { result } = await loaded('?keyword=고스락');
    act(() => {
      realReplace(null, '', '/events?keyword=소음&tagIds=2');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await waitFor(() => expect(result.current.keywordInput).toBe('소음'));
    expect(result.current.filter.tagIds).toEqual([2]);
  });
});

describe('공연 리스트 — 없는 태그(Event_400_23)', () => {
  it('없는 태그 id면 GE-11을 다시 받고 태그 필터를 비워 다시 읽는다(검색어는 유지)', async () => {
    const sent = recordRequests();
    const { result } = open('?keyword=고스락&tagIds=1,999');
    await waitFor(() => expect(search()).toBe('?keyword=고스락'));
    await waitFor(() => expect(result.current.events.status).toBe('success'));
    expect(result.current.filter).toEqual({ keyword: '고스락', tagIds: [], includePast: false });
    const lines = (await sent.list()).map(
      (r) => `${r.path} ${new URLSearchParams(r.query).toString()}`,
    );
    expect(lines.filter((l) => l.startsWith('/api/v2/tags'))).toHaveLength(2);
    expect(lines.filter((l) => l.startsWith('/api/v2/events'))).toEqual([
      `/api/v2/events ${new URLSearchParams({ keyword: '고스락', tagIds: '1,999', page: '0' })}`,
      `/api/v2/events ${new URLSearchParams({ keyword: '고스락', page: '0' })}`,
    ]);
  });

  it('그 밖의 400은 필터를 건드리지 않고 error다', async () => {
    server.use(
      http.get('*/api/v2/events', ({ request }) =>
        Response.json(
          {
            success: false,
            status: 400,
            code: 'GLOBAL_400_1',
            reason: '검증 오류',
            timeStamp: '',
            path: request.url,
          },
          { status: 400 },
        ),
      ),
    );
    const { result } = await loaded('?tagIds=1');
    expect(result.current.events.status).toBe('error');
    expect(search()).toBe('?tagIds=1');
  });
});
