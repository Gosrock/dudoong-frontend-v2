'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getErrorCode } from '@/api/errors';
import { eventManageQuery } from '@/api/event/queries';
import { type ErrorCodeHandlers, handleError } from '@/api/handle-error';
import {
  approveOrderMutation,
  cancelHostOrderMutation,
  completeRefundMutation,
  refuseOrderMutation,
} from '@/api/order/mutations';
import { hostOrderQuery } from '@/api/order/queries';
import type { HostOrderDetail } from '@/api/order/schema';
import { useEventScope } from '@/features/hosting/event/model/useEventScope';
import { can } from '@/features/shared/permission/model/can';
import { type Result, tryCatch } from '@/utils/try-catch';

import { applyChangedOrder, invalidateGuestLists, refetchOrder } from './guest-cache';
import {
  APPROVE_ERROR_MESSAGE,
  CANCEL_CONFIRM,
  CANCEL_REASON_ERROR,
  CANCEL_REASON_MAX,
  DETAIL_MISSING_MESSAGE,
  isDudoongOrder,
  ORDER_ACTION_BLOCK_MESSAGE,
  type OrderActionKey,
  orderActionsOf,
  REFUND_ERROR_MESSAGE,
  REFUSE_CONFIRM,
  type RefuseForm,
  type RefuseReasonKey,
  toCancelBody,
  toRefuseBody,
  validateRefuse,
  WITHDRAW_ERROR_MESSAGE,
} from './guest-rules';

const INITIAL_REFUSE: RefuseForm = { reasonType: null, reasonText: '' };

/**
 * 예매자 관리 주문 상세(GR-2) + 처리(PR-3 승인 · PR-4 거절 · PR-5 승인 후 취소 · PF-2 환불 완료), plan P13a.
 * 열기·닫기는 주소(`?order=` — `useGuestsUrlState`)가 정한다. 값·상태·동작만 돌려준다 — 시트·확인 팝업은 V.
 *
 * - 버튼: `actions`(매니저 이상, 상태별, 공연 시작 후 비활성 — `orderActionsOf`). 일반 멤버는 빈 목록
 * - 처리 성공: 응답을 GR-2에 넣고 GR-1(`counts`)·GF-1·GI-1·GD-1을 다시 읽는다(승인·취소는 T-1·GP-5도 — 재고)
 * - 승인 실패(재고·1인 제한·탈퇴): 안내 + 주문은 승인 대기로 남는다(거절로 정리). 이미 처리됨·공연 OPEN 아님·시작 후:
 *   안내 + GR-2·GE-3 다시 읽기(운영자 대리 처리 #828도 이 길로 흡수)
 * - 거절: 사유 4종, 기타는 문구 1~20자(`Order_400_18`은 칸 오류). 승인 후 취소: 사유 선택 100자
 * - 404 `Order_404_1`(다른 공연·없는 주문 — 조회·처리 모두): 공용 404가 아니라 `onMissing()`(닫기) + 목록 다시 읽기 + `missingNotice`
 * - 약관 안내(legal-copy C-2~C-4): 두둥 주문이면 거절·취소 확인에 직접 환불 안내 줄(`refuseConfirm`·`cancelConfirm`)
 */
export function useOrderDetail(
  eventId: string,
  orderUuid: string | null,
  { onMissing }: { onMissing: () => void },
) {
  const queryClient = useQueryClient();
  const scope = useEventScope(eventId);
  const query = useQuery({
    ...hostOrderQuery(eventId, orderUuid ?? ''),
    enabled: orderUuid !== null,
  });
  const detail: HostOrderDetail | null = orderUuid !== null ? (query.data ?? null) : null;

  const [actionError, setActionError] = useState<string | null>(null);
  const [missingNotice, setMissingNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<OrderActionKey | null>(null);
  const [refuse, setRefuse] = useState<RefuseForm>(INITIAL_REFUSE);
  const [refuseAttempted, setRefuseAttempted] = useState(false);
  const [refuseServerError, setRefuseServerError] = useState<string | null>(null);
  const [cancelReason, setCancelReasonState] = useState('');

  // 다른 주문을 열면 폼·안내를 비운다(렌더 중 이전 값 비교 — 이펙트를 쓰지 않는다)
  const [seenUuid, setSeenUuid] = useState(orderUuid);
  if (seenUuid !== orderUuid) {
    setSeenUuid(orderUuid);
    setActionError(null);
    setRefuse(INITIAL_REFUSE);
    setRefuseAttempted(false);
    setRefuseServerError(null);
    setCancelReasonState('');
  }

  const missing = useCallback(() => {
    setMissingNotice(DETAIL_MISSING_MESSAGE);
    void invalidateGuestLists(queryClient, eventId);
    onMissing();
  }, [eventId, onMissing, queryClient]);

  // 조회 404 → 닫고 목록 다시 읽기. 안내는 렌더 중에(이전 값 비교), 닫기·무효화는 이펙트에서
  const notFound = orderUuid !== null && getErrorCode(query.error) === 'Order_404_1';
  const [missingFor, setMissingFor] = useState<string | null>(null);
  if (notFound && missingFor !== orderUuid) {
    setMissingFor(orderUuid);
    setMissingNotice(DETAIL_MISSING_MESSAGE);
  }
  useEffect(() => {
    if (!notFound) return;
    void invalidateGuestLists(queryClient, eventId);
    onMissing();
  }, [eventId, notFound, onMissing, queryClient]);

  /** 안내 + 상세·목록 다시 읽기. `eventChanged`면 GE-3도(공연 상태·시작 여부가 바뀌었을 수 있다) */
  const reread = useCallback(
    (message: string, eventChanged: boolean) => {
      setActionError(message);
      if (orderUuid) void refetchOrder(queryClient, eventId, orderUuid);
      if (eventChanged) {
        void queryClient.invalidateQueries({
          queryKey: eventManageQuery(eventId).queryKey,
          exact: true,
        });
      }
    },
    [eventId, orderUuid, queryClient],
  );

  const approveCodes = useMemo<ErrorCodeHandlers>(
    () => ({
      Ticket_Item_400_1: () => setActionError(APPROVE_ERROR_MESSAGE.Ticket_Item_400_1),
      Ticket_Item_400_6: () => setActionError(APPROVE_ERROR_MESSAGE.Ticket_Item_400_6),
      Order_400_14: () => setActionError(APPROVE_ERROR_MESSAGE.Order_400_14),
      Order_400_3: () => reread(APPROVE_ERROR_MESSAGE.Order_400_3, false),
      Event_400_5: () => reread(APPROVE_ERROR_MESSAGE.Event_400_5, true),
      Event_400_6: () => reread(APPROVE_ERROR_MESSAGE.Event_400_6, true),
      Order_404_1: missing,
    }),
    [missing, reread],
  );
  const withdrawCodes = useMemo<ErrorCodeHandlers>(
    () => ({
      Order_400_5: () => reread(WITHDRAW_ERROR_MESSAGE.Order_400_5, false),
      Order_400_9: () => reread(WITHDRAW_ERROR_MESSAGE.Order_400_9, true),
      Event_400_5: () => reread(WITHDRAW_ERROR_MESSAGE.Event_400_5, true),
      Order_400_18: () => setRefuseServerError(WITHDRAW_ERROR_MESSAGE.Order_400_18),
      Order_404_1: missing,
    }),
    [missing, reread],
  );
  const refundCodes = useMemo<ErrorCodeHandlers>(
    () => ({
      Order_400_17: () => reread(REFUND_ERROR_MESSAGE.Order_400_17, false),
      Order_404_1: missing,
    }),
    [missing, reread],
  );

  const onChanged = (ticketAvailabilityChanged: boolean) => (d: HostOrderDetail) =>
    applyChangedOrder(queryClient, eventId, d, { ticketAvailabilityChanged });
  const approveM = useMutation({
    ...approveOrderMutation(eventId),
    onSuccess: onChanged(true),
  });
  const refuseM = useMutation({
    ...refuseOrderMutation(eventId),
    // 거절도 승인 대기 수량이 빠져 잔여·구매 가능·T-1 잠금이 바뀐다(계약 대조 2026-10-31)
    onSuccess: onChanged(true),
  });
  const cancelM = useMutation({
    ...cancelHostOrderMutation(eventId),
    onSuccess: onChanged(true),
  });
  const refundM = useMutation({
    ...completeRefundMutation(eventId),
    // 목록 다시 읽기를 기다리지 않는다(환불 탭과 같다 — #106 §5)
    onSuccess: (d) => {
      void onChanged(false)(d);
    },
  });

  const actions = useMemo(
    () => (detail ? orderActionsOf(detail.order, { ...scope.event, myRole: scope.role }) : []),
    [detail, scope.event, scope.role],
  );

  const run = useCallback(
    async (
      key: OrderActionKey,
      call: (uuid: string) => Promise<Result<unknown>>,
      codes: ErrorCodeHandlers,
    ) => {
      const allowed = actions.some((a) => a.key === key && a.enabled);
      if (!orderUuid || pending !== null || !allowed) return false;
      setPending(key);
      setActionError(null);
      const [, error] = await call(orderUuid);
      setPending(null);
      if (!error) return true;
      // 표의 코드는 화면이, 그 밖은 공용 토스트
      handleError(error, codes);
      return false;
    },
    [orderUuid, pending, actions],
  );

  const refuseErrors = refuseAttempted ? validateRefuse(refuse) : {};
  const cancelError = cancelReason.trim().length > CANCEL_REASON_MAX ? CANCEL_REASON_ERROR : null;
  const dudoong = detail ? isDudoongOrder(detail.order) : false;
  const blocked = actions.find((a) => a.blockedBy !== null)?.blockedBy ?? null;

  return {
    /** 주소에 `?order=`가 있는지 */
    open: orderUuid !== null,
    /** GR-2 상태 */
    status: orderUuid === null ? ('idle' as const) : notFound ? ('missing' as const) : query.status,
    retry: () => void query.refetch(),
    detail,
    /** 처리 버튼(매니저 이상만) */
    actions,
    /** 버튼이 막힌 이유 문구(공연 시작 후 등) */
    blockedMessage: blocked ? ORDER_ACTION_BLOCK_MESSAGE[blocked] : null,
    /** 환불 계좌 전체 보기(매니저 이상 — 일반 멤버에게는 서버가 null을 준다) */
    canSeeRefundAccount: can(scope.role, 'viewRefundAccount'),
    pending,
    actionError,
    dismissActionError: () => setActionError(null),
    /** 상세 404로 닫았다는 안내(목록 화면에 보인다) */
    missingNotice,
    dismissMissingNotice: () => setMissingNotice(null),

    approve: () => run('approve', (uuid) => tryCatch(approveM.mutateAsync(uuid)), approveCodes),

    refuseForm: {
      reasonType: refuse.reasonType,
      reasonText: refuse.reasonText,
      setReasonType: (reasonType: RefuseReasonKey) => {
        setRefuse((f) => ({ ...f, reasonType }));
        setRefuseServerError(null);
      },
      setReasonText: (reasonText: string) => {
        setRefuse((f) => ({ ...f, reasonText }));
        setRefuseServerError(null);
      },
      errors: {
        ...refuseErrors,
        ...(refuseServerError && { reasonText: refuseServerError }),
      },
    },
    /** 거절 확인 문구(C-2, 두둥이면 C-3 줄) */
    refuseConfirm: {
      ...REFUSE_CONFIRM,
      dudoongNotice: dudoong ? REFUSE_CONFIRM.dudoongNotice : null,
    },
    /** 칸을 검사하고 보낸다. 거절했으면 `true` */
    refuse: async () => {
      setRefuseAttempted(true);
      if (refuse.reasonType === null || Object.keys(validateRefuse(refuse)).length > 0) {
        return false;
      }
      const body = toRefuseBody({ ...refuse, reasonType: refuse.reasonType });
      return run(
        'refuse',
        (uuid) => tryCatch(refuseM.mutateAsync({ orderUuid: uuid, body })),
        withdrawCodes,
      );
    },

    cancelReason,
    setCancelReason: (v: string) => setCancelReasonState(v),
    cancelReasonMax: CANCEL_REASON_MAX,
    cancelReasonError: cancelError,
    /** 취소 확인 문구(두둥이면 C-4 줄) */
    cancelConfirm: {
      ...CANCEL_CONFIRM,
      dudoongNotice: dudoong ? CANCEL_CONFIRM.dudoongNotice : null,
    },
    cancel: async () => {
      if (cancelError) return false;
      const body = toCancelBody(cancelReason);
      return run(
        'cancel',
        (uuid) => tryCatch(cancelM.mutateAsync({ orderUuid: uuid, body })),
        withdrawCodes,
      );
    },

    completeRefund: () =>
      run('completeRefund', (uuid) => tryCatch(refundM.mutateAsync(uuid)), refundCodes),
  };
}
