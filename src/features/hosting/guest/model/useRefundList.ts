'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { handleError } from '@/api/handle-error';
import { completeRefundMutation, exportRefundsMutation } from '@/api/order/mutations';
import { refundCountsQuery, refundsQuery } from '@/api/order/queries';
import type { OrderSearchType, RefundStatusFilter } from '@/api/order/schema';
import { useEventScope } from '@/features/hosting/shared/model/useEventScope';
import { can } from '@/features/shared/permission/model/can';

import { applyChangedOrder, invalidateGuestLists } from './guest-cache';
import {
  DETAIL_MISSING_MESSAGE,
  exactMatchHintOf,
  ORDER_SEARCH_TYPE_OPTIONS,
  REFUND_ERROR_MESSAGE,
  REFUND_FILTER_OPTIONS,
  searchEmptyMessageOf,
} from './guest-rules';
import { useGuestExport } from './useGuestExport';
import { useTableQueryState } from './useTableQueryState';

/**
 * 예매자 관리 환불 탭(GF-1 · GF-1b · GF-3 · PF-2, plan P13a — GUI `1031:9189`). 상태 필터(건수 칩)·검색·페이지 번호·엑셀·환불 완료.
 *
 * - 검색(주문 탭과 같은 기준 — 이름 · 주문 번호 · 연락처 · 입금자명)과 건수(GF-1b)·엑셀(GF-3, 매니저 이상)은 백엔드 #929(B36 — 2.5.7).
 *   운영 2.5.3에는 없다 — 건수가 실패하면 칩 숫자 없이, 검색 기준 `ORDER_NO`는 400(목록 "불러오지 못했어요")
 *
 * - 계좌는 매니저 이상에게만 값이 온다(`canSeeRefundAccount` — 일반 멤버는 서버가 null). [환불 완료]도 매니저 이상 + `REQUESTED`만
 * - 환불 완료 성공: GR-2에 넣고 GF-1·GR-1·GD-1 다시 읽기. `Order_400_17`(요청 상태 아님 — 운영자가 먼저 처리 #828 등)·404 → 안내 + 목록 다시 읽기
 */
export function useRefundList(eventId: string) {
  const queryClient = useQueryClient();
  const scope = useEventScope(eventId);
  const table = useTableQueryState<RefundStatusFilter, OrderSearchType>('ALL', 'NAME');
  const { filter: status, setFilter: setStatus, page, setPage, searchType, applied } = table;
  const query = useQuery({
    ...refundsQuery(eventId, { status, ...applied, page }),
    placeholderData: keepPreviousData,
  });
  const countsQuery = useQuery({
    ...refundCountsQuery(eventId, applied),
    placeholderData: keepPreviousData,
  });
  const counts = countsQuery.data ?? null;
  const exporter = useGuestExport(
    eventId,
    scope.role,
    exportRefundsMutation(eventId),
    `refunds-${eventId}.xlsx`,
  );
  const [pendingUuid, setPendingUuid] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const m = useMutation({
    ...completeRefundMutation(eventId),
    // 다시 읽기를 기다리지 않는다 — 행은 응답으로 바로 바뀌고(`patchRefundRows`), 토스트·버튼이 목록 다시 읽기에 묶이지 않게(#106 §5)
    onSuccess: (d) => {
      void applyChangedOrder(queryClient, eventId, d, { ticketAvailabilityChanged: false });
    },
  });

  const canManage = can(scope.role, 'manageOrders');
  const rows = (query.data?.content ?? []).map((r) => ({
    refund: r,
    canComplete: canManage && r.refundStatus === 'REQUESTED' && r.orderUuid !== null,
  }));

  const complete = useCallback(
    async (orderUuid: string) => {
      const row = rows.find((r) => r.refund.orderUuid === orderUuid);
      if (!row?.canComplete || pendingUuid !== null) return false;
      setPendingUuid(orderUuid);
      setActionError(null);
      try {
        await m.mutateAsync(orderUuid);
        return true;
      } catch (e) {
        const reread = (message: string) => {
          setActionError(message);
          void invalidateGuestLists(queryClient, eventId);
        };
        // 표에 없는 실패는 공용 토스트
        handleError(e, {
          Order_400_17: () => reread(REFUND_ERROR_MESSAGE.Order_400_17),
          Order_404_1: () => reread(DETAIL_MISSING_MESSAGE),
        });
        return false;
      } finally {
        setPendingUuid(null);
      }
    },
    [eventId, m, pendingUuid, queryClient, rows],
  );

  return {
    status: query.status,
    retry: () => void query.refetch(),
    fetching: query.isFetching,
    /** 상태 칩(건수는 GF-1b — 검색어 반영. 받지 못하면 null) */
    filters: REFUND_FILTER_OPTIONS.map((f) => ({
      ...f,
      count: counts
        ? f.key === 'ALL'
          ? counts.all
          : f.key === 'REQUESTED'
            ? counts.requested
            : counts.completed
        : null,
      selected: f.key === status,
    })),
    statusFilter: status,
    setStatus,
    /** 검색 — 기준 · 입력(50자) · 적용 */
    search: {
      types: ORDER_SEARCH_TYPE_OPTIONS,
      type: searchType,
      setType: table.setSearchType,
      input: table.keywordInput,
      setInput: table.setKeywordInput,
      max: table.keywordMax,
      submit: table.submitSearch,
      applied: applied.keyword,
      exactMatchHint: exactMatchHintOf(scope.role, searchType),
      emptyMessage: searchEmptyMessageOf(scope.role, applied.searchType),
    },
    rows,
    empty: query.status === 'success' && rows.length === 0,
    /** 엑셀(GF-3) — 매니저 이상만. 지금 상태·검색 필터로 받는다 */
    excel: {
      can: exporter.canExport,
      pending: exporter.exporting,
      error: exporter.error,
      dismissError: exporter.dismissError,
      download: () => exporter.download({ status, ...applied }),
    },
    pagination: {
      page,
      totalPages: query.data?.totalPages ?? null,
      hasNext: query.data?.hasNext ?? false,
      setPage,
    },
    /** 환불 계좌 전체 보기(매니저 이상) */
    canSeeRefundAccount: can(scope.role, 'viewRefundAccount'),
    complete,
    pendingUuid,
    actionError,
    dismissActionError: () => setActionError(null),
  };
}
