'use client';

import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';

import { eventManageQuery } from '@/api/event/queries';
import { handleError } from '@/api/handle-error';
import { formatKstDateTime } from '@/api/shared/date';
import { createTicketItemMutation, updateTicketItemMutation } from '@/api/ticket-item/mutations';
import { ticketItemsManageQuery } from '@/api/ticket-item/queries';
import type { EditableTicketPayType } from '@/api/ticket-item/schema';
import { useEventScope } from '@/features/hosting/event/model/useEventScope';

import { applyCreatedTicket, applyUpdatedTicket, invalidateTickets } from './ticket-cache';
import {
  hasTicketFormErrors,
  initialTicketFormValues,
  isTicketFormDirty,
  needsRefundObligation,
  normalizeTicketForm,
  REFUND_OBLIGATION_FIELD,
  TICKET_FIELD_ERRORS,
  TICKET_FORM_ERRORS,
  ticketFieldLocksOf,
  type TicketFormErrors,
  type TicketFormField,
  type TicketFormValues,
  ticketFormValuesOf,
  toCreateTicketBody,
  toUpdateTicketBody,
  validateTicketForm,
} from './ticket-form';
import { isEditablePayType, isPaidOption, ticketsHref } from './ticket-rules';
import { useBankSelect } from './useBankSelect';

/** 이 폼을 고칠 수 없는 이유 — 일반 멤버·끝난 공연(공연 스코프), 티켓 없음 공연(만들기), 기존 PG 티켓(수정) */
export type TicketFormReadOnlyReason = 'role' | 'ended' | 'noTicketEvent' | 'priceTicket';

export const TICKET_FORM_READ_ONLY_MESSAGE: Record<TicketFormReadOnlyReason, string> = {
  role: '일반 멤버는 티켓을 볼 수만 있어요',
  ended: '끝난 공연은 수정할 수 없어요',
  noTicketEvent: '티켓 없는 공연이라 티켓을 만들 수 없어요',
  priceTicket: '이 티켓은 두둥 티켓·무료 티켓이 아니라 고칠 수 없어요',
};

type ServerErrors = Partial<Record<TicketFormField, string>>;

/**
 * 티켓 폼(`/hosting/events/[eventId]/tickets/new` · `…/tickets/[ticketItemId]`, P10/T-2 · T-3 · 은행 목록, plan P12).
 * 값·칸 잠금·칸 오류·저장만 돌려준다(plan §0). 공연 스코프 레이아웃 안에서 쓴다. 수정은 T-1 목록에서 그 티켓을 찾는다(없으면 `missing`).
 *
 * - 결제 방식 두둥/무료: 무료면 가격·계좌 없음 + 승인 토글을 연다, 두둥이면 승인 켠 채 잠금
 * - 무제한이면 재고 공개를 끄고 비활성(`locks.quantityPublic`) — 기본값 그대로 저장해도 서버가 받는 조합
 * - 잠긴 티켓(`isSold || hasPendingOrders`): 결제 방식·이름·가격·계좌·승인을 바꾸지 않고 수량은 늘리기만(`locks.locked`)
 * - 은행은 목록에서만 고른다(`bank` — `useBankSelect`), 보낼 때는 `bankCode`
 * - 저장: 만들기는 '값 없음' 키를 빼고, 수정은 바뀐 필드만 + 비울 때 `clear[]`. 성공하면 목록 캐시에 넣고(체크리스트 ③·GP-5 무효화)
 *   티켓 목록으로 `replace`
 * - 동의(#840·#873): 두둥 만들기 · 무료 → 두둥 수정에서 사용자가 체크한 `refundObligationAgreed`만 싣는다. 체크 칸은 Q42 대기라
 *   `agreement.field`가 false — 지금은 보내지 않는다. 칸이 생기면 동의 전 저장을 막는다
 * - 에러(patterns §24 P12): `Ticket_Item_400_3` 가격 · `400_8` 계좌 · `400_13` 판매 기간 · `400_2` 수량 → 칸 오류(고치면 지운다).
 *   `400_12` 티켓 없음 공연 · `Event_400_17` → 폼 오류 + GE-3 다시 읽기, `400_14` 잠긴 필드 · 404 → 폼 오류 + 목록 다시 읽기,
 *   `400_15` · `400_11` · `Item_Option_Group_400_4` · `Agreement_400_1` → 폼 오류. 그 밖은 공용 토스트(handleError)
 */
export function useTicketForm(
  eventId: string,
  ticketItemId: number | null,
  { now = () => new Date() }: { now?: () => Date } = {},
) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scope = useEventScope(eventId);
  const { data: tickets } = useSuspenseQuery(ticketItemsManageQuery(eventId));
  const ticket =
    ticketItemId === null ? null : (tickets.find((t) => t.ticketItemId === ticketItemId) ?? null);
  const missing = ticketItemId !== null && ticket === null;

  const readOnlyReason: TicketFormReadOnlyReason | null =
    scope.readOnlyReason ??
    (ticket === null && !scope.event.hasTicket ? 'noTicketEvent' : null) ??
    (ticket !== null && !isEditablePayType(ticket.payType) ? 'priceTicket' : null);
  const canEdit = readOnlyReason === null && !missing;

  const [base, setBase] = useState<TicketFormValues | null>(() =>
    ticket ? ticketFormValuesOf(ticket) : null,
  );
  const [values, setValues] = useState<TicketFormValues>(() =>
    ticket ? ticketFormValuesOf(ticket) : initialTicketFormValues(),
  );
  const [agreed, setAgreed] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<ServerErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const inflight = useRef(false);

  const locks = ticketFieldLocksOf(values, ticket);
  const lockedField = (field: TicketFormField | 'approval' | 'unlimited') => {
    if (!canEdit) return true;
    switch (field) {
      case 'payType':
      case 'name':
      case 'price':
      case 'bankCode':
      case 'accountHolder':
      case 'accountNumber':
        return locks.locked;
      case 'approval':
        return locks.approval;
      default:
        return false;
    }
  };

  const edit = useCallback(
    (field: TicketFormField | null, update: (v: TicketFormValues) => TicketFormValues) => {
      setFormError(null);
      if (field) setServerErrors((prev) => ({ ...prev, [field]: undefined }));
      setValues((v) => normalizeTicketForm(update(v)));
    },
    [],
  );
  const setter =
    <K extends keyof TicketFormValues>(key: K, field: TicketFormField | null) =>
    (value: TicketFormValues[K]) =>
      edit(field, (v) => ({ ...v, [key]: value }));

  const bank = useBankSelect(values.bankCode, (code) => {
    if (lockedField('bankCode')) return;
    edit('bankCode', (v) => ({ ...v, bankCode: code }));
  });

  const ctx = {
    base,
    ticket,
    eventStartAt: scope.event.startAt,
    now: formatKstDateTime(now()),
    bankCodes: bank.codes,
    hasPaidOption: ticket?.options.some(isPaidOption) ?? false,
  };
  const errors: TicketFormErrors = validateTicketForm(values, ctx);
  const dirty = isTicketFormDirty(base, values);
  const agreementRequired = needsRefundObligation(base, values);

  const codes = useMemo(() => {
    const field = (code: keyof typeof TICKET_FIELD_ERRORS) => () => {
      const { field: f, message } = TICKET_FIELD_ERRORS[code];
      setServerErrors((prev) => ({ ...prev, [f]: message }));
    };
    const form = (code: keyof typeof TICKET_FORM_ERRORS, after?: () => void) => () => {
      setFormError(TICKET_FORM_ERRORS[code]);
      after?.();
    };
    const reloadScope = () =>
      void queryClient.invalidateQueries({
        queryKey: eventManageQuery(eventId).queryKey,
        exact: true,
      });
    const reloadList = () => void invalidateTickets(queryClient, eventId);
    return {
      Ticket_Item_400_3: field('Ticket_Item_400_3'),
      Ticket_Item_400_8: field('Ticket_Item_400_8'),
      Ticket_Item_400_13: field('Ticket_Item_400_13'),
      Ticket_Item_400_2: field('Ticket_Item_400_2'),
      Ticket_Item_400_12: form('Ticket_Item_400_12', reloadScope),
      Event_400_17: form('Event_400_17', reloadScope),
      Ticket_Item_400_14: form('Ticket_Item_400_14', reloadList),
      Ticket_Item_404_1: form('Ticket_Item_404_1', reloadList),
      Ticket_Item_400_15: form('Ticket_Item_400_15'),
      Ticket_Item_400_11: form('Ticket_Item_400_11'),
      Item_Option_Group_400_4: form('Item_Option_Group_400_4'),
      Agreement_400_1: form('Agreement_400_1'),
    };
  }, [eventId, queryClient]);

  const createMutation = useMutation({
    ...createTicketItemMutation(eventId),
    onSuccess: (created) => applyCreatedTicket(queryClient, eventId, created),
  });
  const updateMutation = useMutation({
    ...updateTicketItemMutation(eventId),
    onSuccess: (updated) => applyUpdatedTicket(queryClient, eventId, updated),
  });
  const saving = createMutation.isPending || updateMutation.isPending;
  const agreementMissing = REFUND_OBLIGATION_FIELD && agreementRequired && !agreed;
  const canSave = canEdit && !saving && dirty && !hasTicketFormErrors(errors) && !agreementMissing;

  /** 저장했으면 `true`. 고칠 수 없음·바뀐 것 없음·칸 오류·동의 전·저장 중이면 요청하지 않고 `false` */
  const save = useCallback(async () => {
    setAttempted(true);
    if (!canSave || inflight.current) return false;
    inflight.current = true;
    setFormError(null);
    const agreements = { refundObligationAgreed: agreed };
    try {
      if (base === null || ticket === null) {
        const created = await createMutation.mutateAsync(toCreateTicketBody(values, agreements));
        setBase(ticketFormValuesOf(created));
      } else {
        const body = toUpdateTicketBody(base, values, agreements);
        if (!body) return false;
        const updated = await updateMutation.mutateAsync({
          ticketItemId: ticket.ticketItemId,
          body,
        });
        const next = ticketFormValuesOf(updated);
        setBase(next);
        setValues(next);
      }
    } catch (e) {
      handleError(e, codes);
      return false;
    } finally {
      inflight.current = false;
    }
    setAttempted(false);
    setServerErrors({});
    router.replace(ticketsHref(eventId));
    return true;
  }, [
    agreed,
    base,
    canSave,
    codes,
    createMutation,
    eventId,
    router,
    ticket,
    updateMutation,
    values,
  ]);

  const guarded =
    <A extends unknown[]>(
      field: TicketFormField | 'approval' | 'unlimited',
      fn: (...a: A) => void,
    ) =>
    (...a: A) => {
      if (!lockedField(field)) fn(...a);
    };

  return {
    event: scope.event,
    /** 수정이면 그 티켓(T-1), 만들기면 null */
    ticket,
    /** 주소의 티켓이 목록에 없다(지웠거나 다른 공연) — 공용 404(V) */
    missing,
    mode: ticketItemId === null ? ('create' as const) : ('edit' as const),
    canEdit,
    readOnlyReason,
    readOnlyMessage: readOnlyReason ? TICKET_FORM_READ_ONLY_MESSAGE[readOnlyReason] : null,
    values,
    /** 칸 잠금 — `locked`(잠긴 티켓의 결제 방식·이름·가격·계좌·승인), `quantityPublic`(무제한), `approval`(두둥·잠김), `limitedSupply` */
    locks,
    setPayType: guarded('payType', (payType: EditableTicketPayType) =>
      edit('payType', (v) => ({ ...v, payType })),
    ),
    setName: guarded('name', setter('name', 'name')),
    setDescription: guarded('description', setter('description', 'description')),
    setPrice: guarded('price', setter('price', 'price')),
    setUnlimited: guarded('unlimited', (unlimited: boolean) => {
      if (!unlimited && locks.limitedSupply) return;
      edit('supplyCount', (v) => ({ ...v, unlimited }));
    }),
    setSupplyCount: guarded('supplyCount', setter('supplyCount', 'supplyCount')),
    setQuantityPublic: guarded('supplyCount', (on: boolean) => {
      if (locks.quantityPublic) return;
      edit(null, (v) => ({ ...v, isQuantityPublic: on }));
    }),
    setLimitPurchase: guarded('purchaseLimit', setter('limitPurchase', 'purchaseLimit')),
    setPurchaseLimit: guarded('purchaseLimit', setter('purchaseLimit', 'purchaseLimit')),
    setApprovalRequired: guarded('approval', setter('approvalRequired', null)),
    setAccountHolder: guarded('accountHolder', setter('accountHolder', 'accountHolder')),
    setAccountNumber: guarded('accountNumber', setter('accountNumber', 'accountNumber')),
    setSalePeriod: guarded('saleEnd', setter('salePeriod', 'saleEnd')),
    setSaleStartNow: guarded('saleStart', setter('saleStartNow', 'saleStart')),
    setSaleStart: guarded('saleStart', (date: string, time: string) =>
      edit('saleStart', (v) => ({ ...v, saleStartDate: date, saleStartTime: time })),
    ),
    setSaleEnd: guarded('saleEnd', (date: string, time: string) =>
      edit('saleEnd', (v) => ({ ...v, saleEndDate: date, saleEndTime: time })),
    ),
    /** 은행 목록 · 검색 · 고르기(V에서 Combobox) */
    bank,
    /**
     * 환불 의무 동의(#840·#873) — `required`: 이 저장에 동의가 필요한지(두둥 만들기·무료 → 두둥). `field`: 체크 칸이 있는지
     * (Q42 대기 — 지금 false라 그리지 않고 보내지 않는다). `agreed`·`setAgreed`: 사용자가 체크한 값
     */
    agreement: {
      field: REFUND_OBLIGATION_FIELD,
      required: agreementRequired,
      agreed,
      setAgreed,
    },
    errors,
    /** 칸에 붙은 서버 오류 — 그 칸을 고치면 지운다 */
    serverErrors,
    /** 폼 전체 오류(서버) */
    formError,
    attempted,
    dirty,
    saving,
    canSave,
    save,
    listHref: ticketsHref(eventId),
  };
}
