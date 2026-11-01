'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { handleError } from '@/api/handle-error';
import { completeRefundMutation } from '@/api/order/mutations';
import { refundsQuery } from '@/api/order/queries';
import type { RefundStatusFilter } from '@/api/order/schema';
import { useEventScope } from '@/features/hosting/event/model/useEventScope';
import { can } from '@/features/shared/permission/model/can';

import { applyChangedOrder, invalidateGuestLists } from './guest-cache';
import { DETAIL_MISSING_MESSAGE, REFUND_ERROR_MESSAGE, REFUND_FILTER_OPTIONS } from './guest-rules';

/**
 * 예매자 관리 환불 탭(GF-1 · PF-2, plan P13a — Figma에 없어 백엔드 GF-1을 그대로 세 번째 탭으로). 상태 필터·페이지 번호·환불 완료.
 *
 * - 계좌는 매니저 이상에게만 값이 온다(`canSeeRefundAccount` — 일반 멤버는 서버가 null). [환불 완료]도 매니저 이상 + `REQUESTED`만
 * - 환불 완료 성공: GR-2에 넣고 GF-1·GR-1·GD-1 다시 읽기. `Order_400_17`(요청 상태 아님 — 운영자가 먼저 처리 #828 등)·404 → 안내 + 목록 다시 읽기
 */
export function useRefundList(eventId: string) {
  const queryClient = useQueryClient();
  const scope = useEventScope(eventId);
  const [status, setStatusState] = useState<RefundStatusFilter>('ALL');
  const [page, setPage] = useState(0);
  const query = useQuery({
    ...refundsQuery(eventId, { status, page }),
    placeholderData: keepPreviousData,
  });
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
    filters: REFUND_FILTER_OPTIONS.map((f) => ({ ...f, selected: f.key === status })),
    statusFilter: status,
    setStatus: (next: RefundStatusFilter) => {
      setStatusState(next);
      setPage(0);
    },
    rows,
    empty: query.status === 'success' && rows.length === 0,
    page,
    totalPages: query.data?.totalPages ?? null,
    hasNext: query.data?.hasNext ?? false,
    setPage,
    /** 환불 계좌 전체 보기(매니저 이상) */
    canSeeRefundAccount: can(scope.role, 'viewRefundAccount'),
    complete,
    pendingUuid,
    actionError,
    dismissActionError: () => setActionError(null),
  };
}
