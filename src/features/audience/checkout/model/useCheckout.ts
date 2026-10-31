'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';
import { type Resolver, useForm, useWatch } from 'react-hook-form';

import { isNotFound, isSessionLost } from '@/api/errors';
import { handleError } from '@/api/handle-error';
import { meQuery } from '@/api/me/queries';
import { createOrderMutation } from '@/api/order/mutations';
import { orderTotalAmount } from '@/api/order/price';
import { checkoutQuery, myOrderQuery } from '@/api/order/queries';
import type { Checkout } from '@/api/order/schema';
import { eventTicketItemsQuery } from '@/api/ticket-item/queries';
import { toTicketView } from '@/features/audience/event/model/ticket-state';
import { toast } from '@/ui/components/Toast/Toast';

import {
  CHECKOUT_ERROR_TABLE,
  type CheckoutErrorOutcome,
  FREE_FCFS_FAILED,
} from './checkout-errors';
import { type CheckoutParams, eventHref } from './checkout-params';
import {
  checkoutAgreementFields,
  checkoutFormSchema,
  type CheckoutFormValues,
  effectiveMode,
  hasOptions,
  initialCheckoutValues,
  type OptionMode,
  resizeTickets,
  sameToTickets,
  ticketsAgree,
  toAmountInput,
  toOrderBody,
  unanswerableOption,
} from './option-form';
import { orderCreatedHref } from './order-result';
import { checkoutKind, ctaLabel, needsDepositConfirm, tossTransferLink } from './payment';

// ─── 1단계: 결제 화면 조회 ─────────────────────────────────────

/** 체크아웃을 열 수 없는 이유. 모두 공연 상세(티켓 선택)로 돌려보낸다(patterns §16) */
export type CheckoutUnavailableReason =
  /** 주소의 `ticketItemId`·`quantity`가 틀림 */
  | 'INVALID_PARAMS'
  /** O-0 404 — 판매 중이 아니거나 다른 공연 티켓 */
  | 'NOT_FOUND'
  /** 매진·판매 불가 */
  | 'NOT_PURCHASABLE'
  /** v2에서 주문할 수 없는 티켓(PG 결제, 답할 수 없는 v1 옵션) */
  | 'UNSUPPORTED';

export type CheckoutDataState =
  | { status: 'pending' }
  | { status: 'unavailable'; reason: CheckoutUnavailableReason; backHref: string }
  | { status: 'ready'; checkout: Checkout; depositorName: string | null };

/**
 * G11/O-0 + 세션(입금자명 = GM-1 닉네임)을 읽어 체크아웃을 열 수 있는지 정한다. 보호 화면이라 게이트가 세션을 확정한 뒤에 돈다.
 * 404가 아닌 첫 조회 실패(5xx·네트워크)는 경계(`AsyncBoundary`)로 던진다.
 */
export function useCheckoutData(eventId: number, params: CheckoutParams | null): CheckoutDataState {
  const backHref = eventHref(eventId);
  const checkout = useQuery({
    ...checkoutQuery(eventId, params?.ticketItemId ?? 0),
    enabled: params !== null,
    throwOnError: (e, q) => q.state.data === undefined && !isNotFound(e) && !isSessionLost(e),
  });
  const me = useQuery(meQuery());

  if (params === null) return { status: 'unavailable', reason: 'INVALID_PARAMS', backHref };
  if (checkout.error && isNotFound(checkout.error) && !checkout.data) {
    return { status: 'unavailable', reason: 'NOT_FOUND', backHref };
  }
  if (!checkout.data || me.data === undefined) return { status: 'pending' };
  const { ticket } = checkout.data;
  if (checkoutKind(ticket) === null || unanswerableOption(ticket)) {
    return { status: 'unavailable', reason: 'UNSUPPORTED', backHref };
  }
  if (toTicketView(ticket, null).state !== 'PURCHASABLE') {
    return { status: 'unavailable', reason: 'NOT_PURCHASABLE', backHref };
  }
  return { status: 'ready', checkout: checkout.data, depositorName: me.data?.name ?? null };
}

// ─── 2단계: 폼 · 금액 · 제출 ───────────────────────────────────

export type UseCheckoutInput = {
  eventId: number;
  /** `useCheckoutData`의 ready 값. 이후 O-0이 다시 오면(재고 계열 에러 뒤) 캐시의 최신 값을 쓴다 */
  checkout: Checkout;
  /** GM-1 닉네임. 사용자가 고칠 수 없다 */
  depositorName: string | null;
  /** 주소의 수량. 상한을 넘으면 상한으로 맞춘다 */
  quantity: number;
};

/**
 * 체크아웃 한 화면의 상태(plan P7). 오버레이를 열지 않는다 — 입금 확인 모달은 V가 `needsDepositConfirm`이면 열고 확인에서 `submit`을 부른다.
 *
 * - 폼: RHF + zod(`option-form.ts`). 옵션이 없으면 옵션 칸을 쓰지 않는다(`hasOptions`)
 * - 금액: `orderTotalAmount` 하나에서(화면에서 다시 계산하지 않는다). 토스 링크 금액도 같은 값
 * - 제출: 요청 중·이동 중에는 다시 보내지 않는다(서버도 10초 안 같은 요청은 앞 주문을 돌려준다).
 *   성공하면 응답을 G11/O-3 키에 넣고 `/orders/[orderUuid]?created=1`로 `replace`(뒤로가기로 체크아웃에 돌아와 다시 내지 못하게)
 * - 에러: patterns §24 P7 행(`checkout-errors.ts`). 재고 계열(`Ticket_Item_400_1`·`Ticket_Item_400_6`·`Order_400_15`)은 GP-5와 O-0을
 *   다시 읽어 상한을 갱신한다. 무료 선착순 확정 실패는 표에 없는 에러로 와도 "다시 시도" 안내(`FREE_FCFS_FAILED`)
 */
export function useCheckout({
  eventId,
  checkout: initial,
  depositorName,
  quantity: requested,
}: UseCheckoutInput) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const ticketItemId = initial.ticket.ticketItemId;
  const latest = useQuery({ ...checkoutQuery(eventId, ticketItemId), enabled: false });
  const checkout = latest.data ?? initial;
  const { ticket, account } = checkout;
  const kind = checkoutKind(ticket) ?? 'TRANSFER';

  // 수량: 요청값을 최신 상한으로 맞춘다(상한이 줄면 따라 준다 — 렌더 중 파생)
  const maxQuantity = toTicketView(ticket, null).maxQuantity;
  const [wanted, setWanted] = useState(requested);
  const quantity = Math.min(Math.max(1, wanted), maxQuantity);

  const schema = useMemo(
    () => checkoutFormSchema(ticket, Math.max(quantity, 1)),
    [ticket, quantity],
  );
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<CheckoutFormValues>,
    defaultValues: initialCheckoutValues(ticket),
  });
  const optionValues = useWatch({ control: form.control, name: 'options' });
  const paymentChannel = useWatch({ control: form.control, name: 'paymentChannel' });
  const mode = hasOptions(ticket) ? effectiveMode(optionValues.mode, quantity) : 'same';

  const amount =
    quantity >= 1
      ? orderTotalAmount(toAmountInput({ options: optionValues }, ticket, quantity))
      : 0;
  const tossLink = kind === 'TRANSFER' ? tossTransferLink(account, amount) : null;

  // ─── 모드 · 수량 ───
  const setMode = useCallback(
    (next: OptionMode, fromTicket?: number): 'ok' | 'needsChoice' => {
      const current = form.getValues('options');
      if (next === 'individual') {
        form.setValue('options.tickets', sameToTickets(current.same, quantity));
        form.setValue('options.mode', 'individual');
        return 'ok';
      }
      const tickets = current.tickets.slice(0, quantity);
      if (fromTicket === undefined && !ticketsAgree(tickets)) return 'needsChoice';
      const source = tickets[fromTicket ?? 0];
      if (source)
        form.setValue(
          'options.same',
          source.map((a) => ({ ...a })),
        );
      form.setValue('options.mode', 'same');
      return 'ok';
    },
    [form, quantity],
  );

  const setQuantity = useCallback(
    (next: number) => {
      if (!Number.isFinite(next) || maxQuantity < 1) return;
      const clamped = Math.min(Math.max(1, Math.trunc(next)), maxQuantity);
      setWanted(clamped);
      const tickets = form.getValues('options.tickets');
      if (tickets.length > 0)
        form.setValue('options.tickets', resizeTickets(tickets, clamped, ticket));
    },
    [form, maxQuantity, ticket],
  );

  // ─── 제출 ───
  const [submitError, setSubmitError] = useState<CheckoutErrorOutcome | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const inflight = useRef(false);

  const refetchTickets = useCallback(() => {
    // 공연 상세의 GP-5(마운트돼 있지 않아도 다시 받아 둔다)와 이 화면의 O-0
    void queryClient
      .fetchQuery({ ...eventTicketItemsQuery(eventId), staleTime: 0 })
      .catch(() => undefined);
    void queryClient
      .fetchQuery({ ...checkoutQuery(eventId, ticketItemId), staleTime: 0 })
      .catch(() => undefined);
  }, [queryClient, eventId, ticketItemId]);

  const onKnownError = useCallback(
    (outcome: CheckoutErrorOutcome, code: string) => {
      if (outcome.refetchTickets) refetchTickets();
      if (outcome.navigate) {
        // 이동하면 폼 상단 문구가 보이지 않으므로 토스트로 남긴다
        toast(outcome.message, { id: `checkout:${code}` });
        router.replace(outcome.navigate === 'orders' ? '/orders' : eventHref(eventId));
        return;
      }
      setSubmitError(outcome);
    },
    [refetchTickets, router, eventId],
  );

  // 주문 캐시 반영은 화면이 사라져도 해야 하므로 옵션의 onSuccess에 둔다
  const mutation = useMutation({
    ...createOrderMutation(),
    onSuccess: (order) => {
      queryClient.setQueryData(myOrderQuery(order.orderUuid).queryKey, order);
    },
  });

  const submit = useCallback(async () => {
    if (inflight.current || succeeded || quantity < 1) return;
    setSubmitError(null);
    if (kind === 'TRANSFER' && !depositorName?.trim()) {
      setSubmitError(CHECKOUT_ERROR_TABLE.Order_400_22);
      return;
    }
    await form.handleSubmit(async (values) => {
      if (inflight.current) return;
      inflight.current = true;
      const body = toOrderBody(values, { eventId, ticket, quantity, depositorName });
      try {
        const order = await mutation.mutateAsync(body);
        setSucceeded(true);
        router.replace(orderCreatedHref(order.orderUuid));
      } catch (e) {
        inflight.current = false;
        handleError(
          e,
          Object.fromEntries(
            Object.entries(CHECKOUT_ERROR_TABLE).map(([code, outcome]) => [
              code,
              () => onKnownError(outcome, code),
            ]),
          ),
          // 무료 선착순은 표에 없는 실패도 화면이 맡는다(공용 토스트 대신 재시도 안내)
          kind === 'FREE_FCFS' ? { otherwise: () => setSubmitError(FREE_FCFS_FAILED) } : {},
        );
      }
    })();
  }, [
    form,
    mutation,
    eventId,
    ticket,
    quantity,
    depositorName,
    kind,
    succeeded,
    onKnownError,
    router,
  ]);

  return {
    ticket,
    /** 입금 계좌(두둥 + 구매 가능일 때만). `null`이면 결제 정보 영역을 그리지 않는다 */
    account: kind === 'TRANSFER' ? account : null,
    kind,
    ctaLabel: ctaLabel(kind),
    /** CTA 뒤 "입금하셨나요?" 확인을 거치는지 */
    needsDepositConfirm: needsDepositConfirm(kind),
    /** RHF 폼(옵션 답·결제 방식·환불 규정 동의·주문 동의). 칸 연결은 V */
    form,
    /**
     * 주문 동의 칸(#840 — Q42 대기라 지금 둘 다 false). `hostProvision`: 호스트 제공 동의(`hostProvisionAgreed`) 칸,
     * `dudoongNotice`: 두둥 입금 전 확인(`dudoongTicketNoticeConfirmed`) 칸 — 두둥티켓만, "입금하셨나요?" 확인 단계에 둔다.
     * 칸이 있으면 체크 전 제출이 막힌다
     */
    agreementFields: checkoutAgreementFields(ticket),
    hasOptions: hasOptions(ticket),
    /** 옵션 모드(수량 1이면 언제나 same — 모드 선택을 그리지 않는다) */
    mode,
    canChooseMode: hasOptions(ticket) && quantity > 1,
    setMode,
    quantity,
    maxQuantity,
    /** 원한 수량(주소·스테퍼)이 상한보다 커서 줄였는지(재고 갱신 뒤 포함) */
    quantityAdjusted: quantity !== wanted,
    setQuantity,
    /** 화면 총액 = 토스 송금 금액 = 서버 `totalAmount` */
    amount,
    paymentChannel,
    /** 토스 송금 링크(토스 송금을 고를 때 쓴다). 계좌가 불완전하거나 무료면 `null` */
    tossLink,
    /** 입금자명(닉네임 고정, 읽기 전용) */
    depositorName,
    /** 확인 모달을 열기 전 검증(칸 오류 표시). 통과하면 true */
    validate: () => form.trigger(),
    submit,
    submitting: mutation.isPending || succeeded,
    /** 폼 상단 오류(입금자명·옵션 답·재고·1인 제한·무료 선착순 실패) */
    submitError,
    dismissSubmitError: () => setSubmitError(null),
  };
}

export type CheckoutState = ReturnType<typeof useCheckout>;
