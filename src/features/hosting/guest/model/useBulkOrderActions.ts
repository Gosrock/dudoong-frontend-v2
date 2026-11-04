'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { errorMessageOf } from '@/api/error-toast';
import { getErrorCode, getErrorStatus, isSessionLost } from '@/api/errors';
import {
  approveOrderMutation,
  bulkApproveOrdersMutation,
  bulkRefuseOrdersMutation,
  refuseOrderMutation,
} from '@/api/order/mutations';
import { hostOrderQuery } from '@/api/order/queries';
import {
  BULK_NOT_PROCESSED,
  BULK_ORDER_MAX,
  type BulkOrderResultResponse,
  type HostOrderElement,
  type RefuseOrderRequest,
} from '@/api/order/schema';
import { useEventScope } from '@/features/hosting/shared/model/useEventScope';
import { type Result, tryCatch } from '@/utils/try-catch';

import { invalidateGuestLists } from './guest-cache';
import { APPROVE_ERROR_MESSAGE, orderActionsOf, WITHDRAW_ERROR_MESSAGE } from './guest-rules';

export type BulkKind = 'approve' | 'refuse';
export type BulkResult = {
  kind: BulkKind;
  succeeded: number;
  /** 실패한 주문과 그 이유(코드 문구 → 없으면 서버 `reason`, 둘 다 없으면 null) */
  failed: { orderUuid: string; message: string | null }[];
};

/** 결과 토스트 문구(GUI `1029:5720` "2건을 승인했어요." · 백엔드 #929 B34 "n건을 승인했어요. m건은 승인하지 못했어요.") */
export function bulkResultMessage({ kind, succeeded, failed }: BulkResult): string {
  const verb = kind === 'approve' ? '승인' : '거절';
  if (failed.length === 0) return `${succeeded}건을 ${verb}했어요.`;
  if (succeeded === 0) return `${failed.length}건 모두 ${verb}하지 못했어요.`;
  return `${succeeded}건을 ${verb}했어요. ${failed.length}건은 ${verb}하지 못했어요.`;
}

/** 시간 상한으로 끝내 처리하지 못한 주문(다시 보내도 하나도 처리되지 않았을 때) */
export const BULK_NOT_PROCESSED_MESSAGE = '시간이 오래 걸려 처리하지 못했어요. 다시 시도해 주세요.';

/** 실패 이유 — 화면 문구는 코드로 나누고 서버 `reason`은 폴백만(CLAUDE.md) */
export function bulkFailureMessage(
  kind: BulkKind,
  code: string | null,
  reason: string | null,
): string | null {
  const table: Record<string, string> =
    kind === 'approve' ? APPROVE_ERROR_MESSAGE : WITHDRAW_ERROR_MESSAGE;
  if (code && code in table) return table[code]!;
  if (code === BULK_NOT_PROCESSED) return BULK_NOT_PROCESSED_MESSAGE;
  return reason;
}

/** 일괄 API가 없는 서버(운영 2.5.3 — 컷오버 전)의 응답. 이때는 단건 API를 차례로 부른다 */
const isBulkUnsupported = (e: unknown) => {
  const status = getErrorStatus(e);
  return status === 404 || status === 405;
};

/** 보내기 — `tryCatch(m.mutateAsync(…))` 결과(에러를 던지지 않는다) */
type Send = (orderUuids: string[]) => Promise<Result<BulkOrderResultResponse>>;
type SendOne = (orderUuid: string) => Promise<Result<unknown>>;

/**
 * 고른 주문을 일괄 API(R-7 · R-8)로 처리한다 — 순수 실행부(테스트용으로 뺐다).
 * - 50건씩 나눠 보낸다(`BULK_ORDER_MAX`). 서버가 한 주문씩 차례로 처리하고 주문마다 결과를 준다
 * - `ORDER_BULK_NOT_PROCESSED`(서버 20초 상한)인 주문만 다시 보낸다. 한 번 보낸 묶음에서 하나도 처리되지 않으면 멈추고 그 주문들은 실패로 둔다
 * - 요청 전체가 404·405(일괄 API가 없는 서버)면 남은 주문을 단건 API로 차례로 부른다(예전 방식 — 동시에 부르지 않는다)
 * - 요청 전체가 그 밖의 이유로 실패하면 남은 주문 모두 그 이유로 실패
 */
export async function runBulkOrders(
  kind: BulkKind,
  orderUuids: readonly string[],
  send: Send,
  sendOne: SendOne,
): Promise<{ result: BulkResult; succeededUuids: string[] } | null> {
  const result: BulkResult = { kind, succeeded: 0, failed: [] };
  const succeededUuids: string[] = [];
  let queue = [...new Set(orderUuids)];
  let bulkSupported = true;
  while (queue.length > 0) {
    if (!bulkSupported) {
      // 차례로 — 같은 티켓 재고를 두고 동시에 승인하면 서버가 재고 검사를 겹쳐 한다(1인 제한 · 재고)
      const uuid = queue.shift()!;
      const [, error] = await sendOne(uuid);
      if (isSessionLost(error)) return null;
      if (error) {
        result.failed.push({
          orderUuid: uuid,
          message: bulkFailureMessage(kind, getErrorCode(error), null),
        });
      } else {
        result.succeeded += 1;
        succeededUuids.push(uuid);
      }
      continue;
    }
    const chunk = queue.slice(0, BULK_ORDER_MAX);
    const [res, error] = await send(chunk);
    if (error) {
      if (isSessionLost(error)) return null;
      if (isBulkUnsupported(error)) {
        bulkSupported = false;
        continue;
      }
      const code = getErrorCode(error);
      const message = bulkFailureMessage(kind, code, null) ?? errorMessageOf(error);
      result.failed.push(...queue.map((orderUuid) => ({ orderUuid, message })));
      break;
    }
    const notProcessed: string[] = [];
    for (const r of res.results) {
      if (r.errorCode === BULK_NOT_PROCESSED) {
        notProcessed.push(r.orderUuid);
      } else if (r.success) {
        result.succeeded += 1;
        succeededUuids.push(r.orderUuid);
      } else {
        result.failed.push({
          orderUuid: r.orderUuid,
          message: bulkFailureMessage(kind, r.errorCode, r.reason),
        });
      }
    }
    const rest = queue.slice(chunk.length);
    if (notProcessed.length === chunk.length) {
      // 하나도 처리되지 않았다 — 다시 보내도 같을 것이라 멈춘다
      result.failed.push(
        ...[...notProcessed, ...rest].map((orderUuid) => ({
          orderUuid,
          message: BULK_NOT_PROCESSED_MESSAGE,
        })),
      );
      break;
    }
    queue = [...notProcessed, ...rest];
  }
  return { result, succeededUuids };
}

/**
 * 예매자 관리 주문 여러 개 선택 → 한 번에 승인·거절(GUI `1029:5422` · `989:693`, #113 · #120 — 2026-11-01).
 *
 * - 일괄 API R-7 · R-8(백엔드 #929 — B34, 2.5.7)로 보낸다(`runBulkOrders` — 50건씩, 처리되지 않은 주문만 다시). 운영 2.5.3처럼 API가
 *   없으면 단건 PR-3 · PR-4를 차례로 부른다
 * - 결과: 성공·실패 건수 + 실패 이유(코드 문구 → 서버 `reason`)
 * - 고를 수 있는 행: 매니저 이상 + 승인 대기 + 승인·거절이 열린 공연(OPEN · 시작 전 — `orderActionsOf`)
 * - 끝나면 처리한 주문 상세(GR-2)·목록·대시보드·티켓 판매 수치를 다시 읽는다(일괄 응답에는 주문 상세가 없다)
 */
export function useBulkOrderActions(eventId: string) {
  const queryClient = useQueryClient();
  const scope = useEventScope(eventId);
  const bulkApproveM = useMutation(bulkApproveOrdersMutation(eventId));
  const bulkRefuseM = useMutation(bulkRefuseOrdersMutation(eventId));
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

  const run = useCallback(
    async (
      kind: BulkKind,
      orderUuids: readonly string[],
      send: Send,
      sendOne: SendOne,
    ): Promise<BulkResult | null> => {
      if (pending !== null || orderUuids.length === 0) return null;
      setPending(kind);
      try {
        const out = await runBulkOrders(kind, orderUuids, send, sendOne);
        await Promise.all([
          ...(out?.succeededUuids ?? []).map((uuid) =>
            queryClient.invalidateQueries({
              queryKey: hostOrderQuery(eventId, uuid).queryKey,
              exact: true,
            }),
          ),
          invalidateGuestLists(queryClient, eventId, { ticketAvailabilityChanged: true }),
        ]);
        return out?.result ?? null;
      } finally {
        setPending(null);
      }
    },
    [eventId, pending, queryClient],
  );

  return {
    /** 고를 수 있는 행인지(체크박스·행 [거절][승인]을 그릴지) */
    isSelectable,
    pending,
    approveMany: (orderUuids: readonly string[]) =>
      run(
        'approve',
        orderUuids,
        (chunk) => tryCatch(bulkApproveM.mutateAsync({ orderUuids: chunk })),
        (uuid) => tryCatch(approveM.mutateAsync(uuid)),
      ),
    refuseMany: (orderUuids: readonly string[], body: RefuseOrderRequest) =>
      run(
        'refuse',
        orderUuids,
        (chunk) => tryCatch(bulkRefuseM.mutateAsync({ orderUuids: chunk, ...body })),
        (uuid) => tryCatch(refuseM.mutateAsync({ orderUuid: uuid, body })),
      ),
  };
}
