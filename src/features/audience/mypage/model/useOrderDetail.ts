'use client';

import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { handleCodes } from '@/api/handle-codes';
import { MY_TICKETS_KEY } from '@/api/my-ticket/queries';
import { cancelMyOrderMutation, putRefundAccountMutation } from '@/api/order/mutations';
import { myOrderQuery } from '@/api/order/queries';
import type { MyOrderDetail } from '@/api/order/schema';
import { banksQuery } from '@/api/refund/queries';

import {
  cancelEntry,
  cancelNotice,
  cancelResult,
  isPaidOrder,
  optionMode,
  orderAmounts,
  refundAccountEntry,
  refuseReasonText,
} from './order-detail';
import {
  CANCEL_ERROR_TABLE,
  messageAfterCancelBlocked,
  type OrderActionOutcome,
  REFUND_ACCOUNT_ERROR_TABLE,
} from './order-errors';
import { orderStatusView } from './order-status';
import {
  refundAccountDefaults,
  type RefundAccountFieldErrors,
  type RefundAccountFormValues,
  toRefundAccountBody,
} from './refund-account-form';

/**
 * 주문상세(`/orders/[orderUuid]`, G11/O-3). 보호 화면이라 `<AsyncBoundary>` 안에서 `useSuspenseQuery`로 읽는다.
 * 남의 주문·없는 주문은 404 → 경계의 공용 404 안내(patterns §11). 삭제된 공연은 200 + `event: null`(#789) — `eventRemoved`로
 * 공연 정보 없이 그리고, 취소 입구·호스트 문의가 없다.
 */
export function useOrderDetail(orderUuid: string) {
  const { data: order } = useSuspenseQuery(myOrderQuery(orderUuid));
  return useMemo(
    () => ({
      order,
      statusView: orderStatusView(order.status, order.refundStatus),
      eventRemoved: order.event === null,
      /** 호스트 문의(GP-3 viewer)를 읽을 공연 id. 삭제된 공연은 null — 문의 입구 없음 */
      contactsEventId: order.event?.eventId ?? null,
      cancel: cancelEntry(order),
      cancelNotice: cancelNotice(order),
      refundAccount: refundAccountEntry(order),
      refuseReason: refuseReasonText(order),
      amounts: orderAmounts(order),
      optionMode: optionMode(order),
    }),
    [order],
  );
}

/** 표(`order-errors.ts`)의 코드 → `handleCodes`. 다시 읽기가 있으면 O-3을 새로 받은 뒤 안내를 정한다 */
function useOrderCodes(
  orderUuid: string,
  table: Record<string, OrderActionOutcome>,
  onOutcome: (outcome: OrderActionOutcome, fresh: MyOrderDetail | undefined) => void,
) {
  const queryClient = useQueryClient();
  return useMemo(
    () =>
      handleCodes(
        Object.fromEntries(
          Object.entries(table).map(([code, outcome]) => [
            code,
            () => {
              if (!outcome.refetch) {
                onOutcome(outcome, undefined);
                return;
              }
              void queryClient
                .fetchQuery({ ...myOrderQuery(orderUuid), staleTime: 0 })
                .catch(() => undefined)
                .then((fresh) => onOutcome(outcome, fresh));
            },
          ]),
        ),
      ),
    [queryClient, orderUuid, table, onOutcome],
  );
}

/** 취소·계좌 변경 뒤 목록·티켓탭이 바뀐다(주문 상태·티켓 취소) */
function invalidateAfterOrderChange(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['me', 'orders', 'infinite'] });
  void queryClient.invalidateQueries({ queryKey: [...MY_TICKETS_KEY] });
}

const bankCodesOf = (queryClient: ReturnType<typeof useQueryClient>) =>
  queryClient.getQueryData(banksQuery().queryKey)?.map((b) => b.code);

/**
 * [주문취소] → P11/O-4. 노출은 `useOrderDetail().cancel`(`canCancel`)이 정한다. 확인 팝업·계좌 시트는 V가 연다.
 * - 유료(`requiresRefundAccount`)는 환불 계좌 값을 받아야 요청한다 — 값 없이 부르면 요청하지 않고 `refundAccountMissing`.
 *   칸 오류는 요청 없이 `fieldErrors`. 성공하면 환불 요청 상태(`result: 'refundRequested'`)
 * - 무료는 본문 없이 보내 바로 취소(`result: 'canceled'`)
 * - 성공 응답으로 O-3 캐시를 채우고(`setQueryData`) 주문내역·티켓탭을 무효화한다
 * - 에러(patterns §24 P9): `Order_400_5`·`Event_400_5`·`Order_400_9` → O-3 다시 읽기 + 안내, `Order_400_24` → 다시 읽은 주문이
 *   선물 조건이면 "선물을 먼저 취소하거나 돌려받아 주세요", `Order_400_25` → `refundAccountMissing`(계좌 시트)
 */
export function useCancelOrder(orderUuid: string) {
  const queryClient = useQueryClient();
  const { data: order } = useSuspenseQuery(myOrderQuery(orderUuid));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<RefundAccountFieldErrors>({});
  const [refundAccountMissing, setRefundAccountMissing] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof cancelResult> | null>(null);

  const onOutcome = useCallback((outcome: OrderActionOutcome, fresh: MyOrderDetail | undefined) => {
    if (outcome.refundAccountMissing) setRefundAccountMissing(true);
    setError(outcome.message ?? messageAfterCancelBlocked(fresh));
  }, []);
  const codes = useOrderCodes(orderUuid, CANCEL_ERROR_TABLE, onOutcome);

  const mutation = useMutation({
    ...cancelMyOrderMutation(orderUuid),
    ...codes,
    onSuccess: (updated) => {
      queryClient.setQueryData(myOrderQuery(orderUuid).queryKey, updated);
      invalidateAfterOrderChange(queryClient);
      setResult(cancelResult(updated));
    },
  });

  const requiresRefundAccount = isPaidOrder(order);
  const cancel = useCallback(
    async (refundAccount?: RefundAccountFormValues) => {
      if (mutation.isPending) return;
      setError(null);
      setFieldErrors({});
      if (!requiresRefundAccount) {
        await mutation.mutateAsync(undefined).catch(() => undefined);
        return;
      }
      if (!refundAccount) {
        setRefundAccountMissing(true);
        return;
      }
      const checked = toRefundAccountBody(refundAccount, bankCodesOf(queryClient));
      if (!checked.ok) {
        setFieldErrors(checked.errors);
        return;
      }
      setRefundAccountMissing(false);
      await mutation.mutateAsync({ refundAccount: checked.body }).catch(() => undefined);
    },
    [mutation, requiresRefundAccount, queryClient],
  );

  return {
    requiresRefundAccount,
    cancel,
    pending: mutation.isPending,
    error,
    fieldErrors,
    refundAccountMissing,
    result,
  };
}

/**
 * 환불 계좌 입력·수정(P11/O-5). 입구는 `useOrderDetail().refundAccount`(`canEditRefundAccount`). 은행 목록은 V가
 * `useQuery(banksQuery())`로 읽는다(이 훅은 캐시에 있으면 코드를 목록과 대조한다).
 * - `defaults` — 폼 처음 값(계좌번호는 비움, `bankCode`가 null이면 은행도 비움)
 * - 성공하면 응답으로 O-3 캐시를 채운다 → `refundAccount.maskedAccountNumber`가 새 값, `refundAccountRequired`가 false
 * - `Order_400_27`·`Order_400_28` → O-3 다시 읽기 + 안내(다시 읽으면 입구가 닫힌다), `Order_400_25` → 안내
 */
export function useRefundAccount(orderUuid: string) {
  const queryClient = useQueryClient();
  const { data: order } = useSuspenseQuery(myOrderQuery(orderUuid));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<RefundAccountFieldErrors>({});
  const [saved, setSaved] = useState(false);

  const onOutcome = useCallback((outcome: OrderActionOutcome) => setError(outcome.message), []);
  const codes = useOrderCodes(orderUuid, REFUND_ACCOUNT_ERROR_TABLE, onOutcome);

  const mutation = useMutation({
    ...putRefundAccountMutation(orderUuid),
    ...codes,
    onSuccess: (updated) => {
      queryClient.setQueryData(myOrderQuery(orderUuid).queryKey, updated);
      void queryClient.invalidateQueries({ queryKey: ['me', 'orders', 'infinite'] });
      setSaved(true);
    },
  });

  const submit = useCallback(
    async (values: RefundAccountFormValues) => {
      if (mutation.isPending) return;
      setError(null);
      setSaved(false);
      const checked = toRefundAccountBody(values, bankCodesOf(queryClient));
      if (!checked.ok) {
        setFieldErrors(checked.errors);
        return;
      }
      setFieldErrors({});
      await mutation.mutateAsync(checked.body).catch(() => undefined);
    },
    [mutation, queryClient],
  );

  const defaults = useMemo(() => refundAccountDefaults(order.refundAccount), [order.refundAccount]);
  return {
    entry: refundAccountEntry(order),
    current: order.refundAccount,
    defaults,
    submit,
    pending: mutation.isPending,
    error,
    fieldErrors,
    saved,
  };
}
