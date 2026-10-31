'use client';

import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getErrorCode } from '@/api/errors';
import { eventListQuery, eventTagsQuery } from '@/api/event/queries';
import { flattenPages } from '@/api/shared/page';

import {
  clampKeyword,
  type EventListFilter,
  eventListSearch,
  KEYWORD_DEBOUNCE_MS,
  parseEventListFilter,
  sameFilter,
  toggleTagId,
} from './event-list-filter';
import { toTagPanel } from './tag-panel';

/** 없는 태그 id(GP-2). GE-11을 다시 받아 태그 필터를 비운다(patterns §13·§24) */
export const INVALID_TAG_CODE = 'Event_400_23';

/**
 * 주소를 바꾼다. Next가 `history.replaceState`를 라우터와 맞춰 `useSearchParams`가 새 값을 준다 —
 * 서버를 다시 부르지 않는 얕은 교체이고 기록을 늘리지 않는다(칩 클릭마다 뒤로가기가 쌓이지 않게).
 * 첫 인자는 `null`이어야 한다 — Next 내부 상태(`__NA`)가 든 값을 넘기면 Next가 자기 이동으로 보고 `useSearchParams`를 갱신하지 않는다.
 */
/** 지금 주소의 필터. 렌더를 기다리지 않아 연속 클릭에도 앞 클릭이 반영된 값이다 */
const currentFilter = () => parseEventListFilter(new URLSearchParams(window.location.search));

function replaceFilter(filter: EventListFilter) {
  const { pathname, search, hash } = window.location;
  const next = eventListSearch(filter, search);
  if (next === search) return;
  window.history.replaceState(null, '', `${pathname}${next}${hash}`);
}

/**
 * 공연 리스트 화면 상태(UI 무관, plan P5a). 게이트 없는 `(app)` 화면이라 조회는 브라우저 `useQuery` 계열만 쓴다.
 * - 적용 필터는 주소(`useSearchParams`)에서 읽는다. 칩·토글은 즉시, 검색어는 입력 뒤 300ms에 주소로
 * - 정렬은 "공연임박순" 고정 — 정렬 상태를 두지 않는다
 * - 목록은 GP-2 무한 목록(필터가 바뀌면 새 키의 첫 페이지부터), 렌더 전에 id로 중복 제거
 * - 태그 패널은 GE-11 응답으로 만든다. GP-2가 `Event_400_23`이면 GE-11을 다시 받고 태그 필터를 비운다
 */
export function useEventList() {
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  // 주소 문자열이 같으면 같은 객체 — 아래 effect·쿼리 키가 렌더마다 바뀌지 않게
  const filter = useMemo(() => parseEventListFilter(new URLSearchParams(search)), [search]);
  const queryClient = useQueryClient();

  // ─── 검색어 입력(주소 반영 전 초안) ───
  const [keywordInput, setKeywordInputState] = useState(filter.keyword);
  const [syncedKeyword, setSyncedKeyword] = useState(filter.keyword);
  if (filter.keyword !== syncedKeyword) {
    // 뒤로가기·초기화 등 바깥에서 주소가 바뀌면 입력칸도 따라간다
    // (입력이 만든 변화면 그대로 둔다 — 치는 중인 끝 공백을 지우지 않게)
    setSyncedKeyword(filter.keyword);
    if (keywordInput.trim() !== filter.keyword) setKeywordInputState(filter.keyword);
  }

  const applyKeyword = useCallback((value: string) => {
    const keyword = clampKeyword(value).trim();
    const current = currentFilter();
    if (keyword !== current.keyword) replaceFilter({ ...current, keyword });
  }, []);

  useEffect(() => {
    if (keywordInput.trim() === filter.keyword) return;
    const timer = setTimeout(() => applyKeyword(keywordInput), KEYWORD_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [keywordInput, filter.keyword, applyKeyword]);

  const update = useCallback((patch: Partial<EventListFilter>) => {
    const current = currentFilter();
    const next = { ...current, ...patch };
    if (!sameFilter(next, current)) replaceFilter(next);
  }, []);

  // ─── 조회 ───
  const tagsQuery = useQuery(eventTagsQuery());
  const list = useInfiniteQuery(
    eventListQuery({
      keyword: filter.keyword,
      tagIds: filter.tagIds,
      includePast: filter.includePast,
    }),
  );

  const invalidTag = getErrorCode(list.error) === INVALID_TAG_CODE;
  useEffect(() => {
    if (!invalidTag) return;
    void queryClient.invalidateQueries({ queryKey: eventTagsQuery().queryKey });
    replaceFilter({ ...currentFilter(), tagIds: [] });
  }, [invalidTag, queryClient]);

  const events = useMemo(() => flattenPages(list.data, (e) => e.eventId), [list.data]);
  const tagPanel = useMemo(
    () => toTagPanel(tagsQuery.data ?? [], filter.tagIds),
    [tagsQuery.data, filter.tagIds],
  );

  const status: 'pending' | 'error' | 'empty' | 'success' =
    list.isPending || invalidTag
      ? list.isError && !invalidTag
        ? 'error'
        : 'pending'
      : list.isError && !list.data
        ? 'error'
        : events.length === 0
          ? 'empty'
          : 'success';

  return {
    /** 적용된 필터(주소 값) */
    filter,
    /** 검색칸 값(50자에서 막힌다) */
    keywordInput,
    setKeywordInput: (value: string) => setKeywordInputState(clampKeyword(value)),
    /** 기다리지 않고 바로 적용(엔터·검색 버튼) */
    submitKeyword: () => applyKeyword(keywordInput),
    toggleTag: (tagId: number) => update({ tagIds: toggleTagId(currentFilter().tagIds, tagId) }),
    resetTags: () => update({ tagIds: [] }),
    setIncludePast: (includePast: boolean) => update({ includePast }),
    tags: {
      status: tagsQuery.isPending ? 'pending' : tagsQuery.isError ? 'error' : 'success',
      groups: tagPanel.groups,
      selectedCount: tagPanel.selectedCount,
      retry: () => void tagsQuery.refetch(),
    },
    events: {
      status,
      items: events,
      hasNextPage: list.hasNextPage,
      isFetchingNextPage: list.isFetchingNextPage,
      /** 다음 페이지 실패 — 기존 행은 두고 하단 재시도(patterns §12) */
      nextPageError: list.isFetchNextPageError,
      loadMore: () => {
        // 읽는 중에 다시 불려도 진행 중인 요청을 취소·재요청하지 않는다
        if (list.hasNextPage && !list.isFetching) void list.fetchNextPage({ cancelRefetch: false });
      },
      retry: () => void (list.isFetchNextPageError ? list.fetchNextPage() : list.refetch()),
    },
  } as const;
}
