'use client';

import { useCallback, useState } from 'react';

import { OPERATION_KEYWORD_MAX } from '@/api/order/schema';

/**
 * 운영 표의 필터 + 페이지 번호(예매자 관리 주문 · 발급된 티켓 · 환불 탭, 코드 패턴 점검 A16).
 * 필터를 바꾸면 첫 페이지부터. 주소에 남기지 않는다(탭 안의 값 — useOrderList 주석).
 */
export function useTableFilter<F>(initialFilter: F) {
  const [filter, setFilterState] = useState<F>(initialFilter);
  const [page, setPage] = useState(0);
  const setFilter = useCallback((next: F) => {
    setFilterState(next);
    setPage(0);
  }, []);
  return { filter, setFilter, page, setPage };
}

/**
 * 운영 표의 필터 · 검색 · 페이지 번호(주문 · 발급된 티켓 탭 — A16). 검색은 기준 + 입력 초안(`OPERATION_KEYWORD_MAX`자에서 자름)을
 * `submitSearch()`로 적용하고 첫 페이지부터 — 적용된 값(`applied`)만 조회 키에 들어간다. `clearSearch()`는 입력·적용 모두 비운다.
 * 조회(`keepPreviousData`)와 엑셀은 호출 쪽 훅이 맡는다.
 */
export function useTableQueryState<F, S>(initialFilter: F, initialSearchType: S) {
  const { filter, setFilter, page, setPage } = useTableFilter(initialFilter);
  const [searchType, setSearchType] = useState<S>(initialSearchType);
  const [keywordInput, setKeywordInputState] = useState('');
  const [applied, setApplied] = useState<{ searchType: S; keyword: string }>({
    searchType: initialSearchType,
    keyword: '',
  });

  const setKeywordInput = useCallback(
    (v: string) => setKeywordInputState(v.slice(0, OPERATION_KEYWORD_MAX)),
    [],
  );
  const submitSearch = useCallback(() => {
    setApplied({ searchType, keyword: keywordInput.trim() });
    setPage(0);
  }, [keywordInput, searchType, setPage]);
  const clearSearch = useCallback(() => {
    setKeywordInputState('');
    setApplied({ searchType, keyword: '' });
    setPage(0);
  }, [searchType, setPage]);

  return {
    filter,
    setFilter,
    page,
    setPage,
    searchType,
    setSearchType,
    keywordInput,
    setKeywordInput,
    keywordMax: OPERATION_KEYWORD_MAX,
    submitSearch,
    clearSearch,
    /** 조회 키에 들어가는 적용된 검색(기준 · 검색어) */
    applied,
  };
}
