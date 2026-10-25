'use client';

import { useInfiniteQuery, type UseInfiniteQueryResult } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { myEventsQuery } from '@/api/event/queries';
import { myHostsQuery } from '@/api/host/queries';
import { flattenPages } from '@/api/shared/page';

import {
  clampHostingKeyword,
  emptyKindOf,
  HOSTING_HOME_TABS,
  HOSTING_KEYWORD_DEBOUNCE_MS,
  type HostingEmptyKind,
  hostingHomeSearch,
  type HostingHomeTab,
  myEventHref,
  myHostHref,
  parseHostingHomeTab,
} from './hosting-home';

/** 탭을 주소에 남긴다 — 서버를 다시 부르지 않는 얕은 교체(첫 인자 `null`, patterns §13) */
function replaceTab(tab: HostingHomeTab) {
  const { pathname, search, hash } = window.location;
  const next = hostingHomeSearch(tab, search);
  if (next === search) return;
  window.history.replaceState(null, '', `${pathname}${next}${hash}`);
}

type ListStatus = 'pending' | 'error' | 'empty' | 'success';

/** 무한 목록 하나의 화면 상태(patterns §12 — 다음 페이지 실패는 기존 행을 두고 하단 재시도) */
function listState<T>(
  query: UseInfiniteQueryResult<unknown>,
  items: T[],
  keyword: string,
): {
  status: ListStatus;
  items: T[];
  emptyKind: HostingEmptyKind | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  nextPageError: boolean;
  loadMore: () => void;
  retry: () => void;
} {
  const status: ListStatus = query.isPending
    ? 'pending'
    : query.isError && !query.data
      ? 'error'
      : items.length === 0
        ? 'empty'
        : 'success';
  return {
    status,
    items,
    emptyKind: status === 'empty' ? emptyKindOf(keyword) : null,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    nextPageError: query.isFetchNextPageError,
    loadMore: () => {
      // 읽는 중에 다시 불려도 진행 중인 요청을 취소·재요청하지 않는다
      if (query.hasNextPage && !query.isFetching)
        void query.fetchNextPage({ cancelRefetch: false });
    },
    retry: () => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch()),
  };
}

/**
 * 공연준비 홈(`/hosting`, plan P10a) 화면 상태. UI 동작은 없다(plan §0).
 *
 * - 탭: 주소 `?tab=hosts`(기본 공연 탭은 주소에 쓰지 않는다). 호스트를 만든 뒤 호스트 탭으로 돌아오게 하려고 주소에 둔다
 * - 검색: 칸 하나가 지금 탭의 목록을 찾는다. 입력 뒤 300ms에 적용(50자에서 막는다), 탭을 바꿔도 검색어는 남는다
 * - 목록: GH-1(호스트 탭)·GE-1(공연 탭) 무한 목록. **지금 탭의 목록만 부른다**(`enabled`). 검색어가 바뀌면 새 키의 첫 페이지부터
 * - 조회는 브라우저에서만 — 호스팅 레이아웃의 게이트가 세션을 확정한 뒤 이 훅이 마운트된다(서버 조회 없음)
 * - 카드: 호스트별 `myRole`(배지는 V), 이동 주소(호스트 → 호스트 홈, 공연 → 공연 관리)
 */
export function useHostingHome() {
  const searchParams = useSearchParams();
  const tab = parseHostingHomeTab(searchParams);

  // ─── 검색어(입력 초안 → 300ms 뒤 적용) ───
  const [keywordInput, setKeywordInputState] = useState('');
  const [keyword, setKeyword] = useState('');
  useEffect(() => {
    const next = keywordInput.trim();
    if (next === keyword) return;
    const timer = setTimeout(() => setKeyword(next), HOSTING_KEYWORD_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [keywordInput, keyword]);

  // ─── 조회 ───
  const hostsQuery = useInfiniteQuery({ ...myHostsQuery({ keyword }), enabled: tab === 'hosts' });
  const eventsQuery = useInfiniteQuery({
    ...myEventsQuery({ keyword }),
    enabled: tab === 'events',
  });

  const hosts = useMemo(
    () =>
      flattenPages(hostsQuery.data, (h) => h.hostId).map((h) => ({ ...h, href: myHostHref(h) })),
    [hostsQuery.data],
  );
  const events = useMemo(
    () =>
      flattenPages(eventsQuery.data, (e) => e.eventId).map((e) => ({ ...e, href: myEventHref(e) })),
    [eventsQuery.data],
  );

  const setTab = useCallback((next: HostingHomeTab) => replaceTab(next), []);

  return {
    tabs: HOSTING_HOME_TABS,
    tab,
    setTab,
    /** 검색칸 값(50자에서 막힌다) */
    keywordInput,
    setKeywordInput: (value: string) => setKeywordInputState(clampHostingKeyword(value)),
    /** 기다리지 않고 바로 적용(엔터·검색 버튼) */
    submitKeyword: () => setKeyword(keywordInput.trim()),
    /** 적용된 검색어 */
    keyword,
    hosts: listState(hostsQuery, hosts, keyword),
    events: listState(eventsQuery, events, keyword),
  } as const;
}
