'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { exportOrdersMutation } from '@/api/order/mutations';
import { hostOrdersQuery } from '@/api/order/queries';
import type { HostOrderStatusFilter, OrderSearchType } from '@/api/order/schema';
import { useEventScope } from '@/features/hosting/shared/model/useEventScope';

import {
  exactMatchHintOf,
  ORDER_SEARCH_TYPE_OPTIONS,
  ORDER_STATUS_TABS,
  searchEmptyMessageOf,
} from './guest-rules';
import { useGuestExport } from './useGuestExport';
import { useTableQueryState } from './useTableQueryState';

/**
 * 예매자 관리 주문 탭(GR-1, plan P13a). 상태 탭·검색·페이지 번호와 엑셀(GR-6)을 돌려준다. UI 동작은 없다.
 * 공연 스코프 레이아웃 안에서 쓴다(GE-3 `useEventScope` — `myRole`).
 *
 * - 상태 탭 5개(FAILED 숨김 — 사용자 결정 2026-10-31, Q32). 탭 건수는 서버 `counts`(검색어 반영, 상태 필터 무시). 상태·검색·페이지는 주소에 남기지 않는다
 * - 검색: 기준(이름·연락처·입금자명) + 검색어 50자. `submitSearch()`로 적용하고 첫 페이지부터. 일반 멤버의 연락처·입금자명은
 *   완전 일치 안내(`exactMatchHint`, #846)
 * - 표는 페이지 번호(patterns §12 — `keepPreviousData`로 넘기는 동안 이전 행을 둔다)
 * - 엑셀: 매니저 이상만 `canExport`. 지금 상태·검색 필터로 받는다
 */
export function useOrderList(eventId: string) {
  const scope = useEventScope(eventId);
  const table = useTableQueryState<HostOrderStatusFilter, OrderSearchType>('ALL', 'NAME');
  const { filter: status, page, searchType, applied } = table;

  const params = { status, ...applied, page };
  const query = useQuery({
    ...hostOrdersQuery(eventId, params),
    placeholderData: keepPreviousData,
  });
  const data = query.data;

  const exporter = useGuestExport(
    eventId,
    scope.role,
    exportOrdersMutation(eventId),
    `orders-${eventId}.xlsx`,
  );

  return {
    event: scope.event,
    /** GR-1 상태(`pending` 첫 조회, `error` 실패 — 이전 행이 있으면 그대로 둔다) */
    status: query.status,
    retry: () => void query.refetch(),
    /** 다음 페이지·필터를 받는 중(이전 행을 보인다) */
    fetching: query.isFetching,
    statusTabs: ORDER_STATUS_TABS.map((t) => ({
      key: t.key,
      label: t.label,
      count: data ? data.counts[t.count] : null,
      selected: t.key === status,
    })),
    statusFilter: status,
    setStatus: table.setFilter,
    /** 검색 — 기준 · 입력(50자) · 적용 · 지우기 */
    search: {
      types: ORDER_SEARCH_TYPE_OPTIONS,
      type: searchType,
      setType: table.setSearchType,
      input: table.keywordInput,
      setInput: table.setKeywordInput,
      max: table.keywordMax,
      submit: table.submitSearch,
      clear: table.clearSearch,
      /** 적용된 검색어(빈 문자열 = 검색 없음) */
      applied: applied.keyword,
      /** 일반 멤버의 연락처·입금자명 검색 칸 안내(#846) */
      exactMatchHint: exactMatchHintOf(scope.role, searchType),
      /** 검색 결과가 없을 때 문구(일반 멤버의 연락처·입금자명이면 전체 값 안내) */
      emptyMessage: searchEmptyMessageOf(scope.role, applied.searchType),
    },
    rows: data?.orders.content ?? [],
    empty: query.status === 'success' && data?.orders.content.length === 0,
    pagination: {
      page,
      totalPages: data?.orders.totalPages ?? null,
      totalElements: data?.orders.totalElements ?? null,
      hasNext: data?.orders.hasNext ?? false,
      setPage: table.setPage,
    },
    /** 엑셀(GR-6) — 매니저 이상만 */
    excel: {
      can: exporter.canExport,
      pending: exporter.exporting,
      error: exporter.error,
      dismissError: exporter.dismissError,
      download: () => exporter.download({ status, ...applied }),
    },
  };
}
