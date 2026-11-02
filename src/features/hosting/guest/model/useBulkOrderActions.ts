'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { getErrorCode } from '@/api/errors';
import { approveOrderMutation, refuseOrderMutation } from '@/api/order/mutations';
import { hostOrderQuery } from '@/api/order/queries';
import type { HostOrderDetail, HostOrderElement, RefuseOrderRequest } from '@/api/order/schema';
import { useEventScope } from '@/features/hosting/shared/model/useEventScope';
import { type Result, tryCatch } from '@/utils/try-catch';

import { invalidateGuestLists } from './guest-cache';
import { APPROVE_ERROR_MESSAGE, orderActionsOf, WITHDRAW_ERROR_MESSAGE } from './guest-rules';

export type BulkKind = 'approve' | 'refuse';
export type BulkResult = {
  kind: BulkKind;
  succeeded: number;
  /** 실패한 주문과 그 이유(코드 문구, 모르는 코드는 null) */
  failed: { orderUuid: string; message: string | null }[];
};

/** 결과 토스트 문구(GUI `1029:5720` "2건을 승인했어요.") — 일부 실패면 실패 건수를 더한다 */
export function bulkResultMessage({ kind, succeeded, failed }: BulkResult): string {
  const verb = kind === 'approve' ? '승인' : '거절';
  if (failed.length === 0) return `${succeeded}건을 ${verb}했어요.`;
  if (succeeded === 0) return `${failed.length}건 모두 ${verb}하지 못했어요.`;
  return `${succeeded}건을 ${verb}했어요. ${failed.length}건은 ${verb}하지 못했어요.`;
}

const messageOf = (kind: BulkKind, error: unknown): string | null => {
  const code = getErrorCode(error);
  const table: Record<string, string> =
    kind === 'approve' ? APPROVE_ERROR_MESSAGE : WITHDRAW_ERROR_MESSAGE;
  return code && code in table ? table[code]! : null;
};

/**
 * 예매자 관리 주문 여러 개 선택 → 한 번에 승인·거절(GUI `1029:5422` · `989:693`, #113 · #120 — 2026-11-01). L 추가(p13a-gui-guests).
 *
 * - **일괄 API가 없다**(백엔드 `V2OrderManageController` dev `f45882e3` — 주문 하나씩 PR-3 · PR-4). 고른 주문을 차례로 부르고
 *   성공·실패 건수를 돌려준다(부분 실패 안내). 일괄 API는 backend-questions B34
 * - 고를 수 있는 행: 매니저 이상 + 승인 대기 + 승인·거절이 열린 공연(OPEN · 시작 전 — `orderActionsOf`)
 * - 끝나면 성공한 주문 상세(GR-2)를 응답으로 바꾸고 목록·대시보드·티켓 판매 수치를 한 번 다시 읽는다
 */
export function useBulkOrderActions(eventId: string) {
  const queryClient = useQueryClient();
  const scope = useEventScope(eventId);
  const approveM = useMutation(approveOrderMutation(eventId));
  const refuseM = useMutation(refuseOrderMutation(eventId));
  const [pending, setPending] = useState<BulkKind | null>(null);

  const isSelectable = useCallback(
    (o: Pick<HostOrderElement, 'status' | 'refundStatus'>) =>
      orderActionsOf(o, { ...scope.event, myRole: scope.role }).some(
        (a) => a.key === 'approve' && a.enabled,
      ),
    [scope.event, scope.role],
  );

  const runMany = useCallback(
    async (
      kind: BulkKind,
      orderUuids: readonly string[],
      call: (uuid: string) => Promise<Result<HostOrderDetail>>,
    ): Promise<BulkResult | null> => {
      if (pending !== null || orderUuids.length === 0) return null;
      setPending(kind);
      const result: BulkResult = { kind, succeeded: 0, failed: [] };
      // 차례로 — 같은 티켓 재고를 두고 동시에 승인하면 서버가 재고 검사를 겹쳐 한다(1인 제한 · 재고)
      for (const uuid of orderUuids) {
        const [detail, error] = await call(uuid);
        if (error) {
          result.failed.push({ orderUuid: uuid, message: messageOf(kind, error) });
        } else {
          result.succeeded += 1;
          queryClient.setQueryData(hostOrderQuery(eventId, uuid).queryKey, detail);
        }
      }
      await invalidateGuestLists(queryClient, eventId, { ticketAvailabilityChanged: true });
      setPending(null);
      return result;
    },
    [eventId, pending, queryClient],
  );

  return {
    /** 고를 수 있는 행인지(체크박스·행 [거절][승인]을 그릴지) */
    isSelectable,
    pending,
    approveMany: (orderUuids: readonly string[]) =>
      runMany('approve', orderUuids, (uuid) => tryCatch(approveM.mutateAsync(uuid))),
    refuseMany: (orderUuids: readonly string[], body: RefuseOrderRequest) =>
      runMany('refuse', orderUuids, (uuid) =>
        tryCatch(refuseM.mutateAsync({ orderUuid: uuid, body })),
      ),
  };
}
