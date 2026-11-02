'use client';

import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { handleError } from '@/api/handle-error';
import { formatKstDateTime } from '@/api/shared/date';
import { createTicketItemMutation, updateTicketItemMutation } from '@/api/ticket-item/mutations';
import { ticketItemsManageQuery } from '@/api/ticket-item/queries';
import type { EditableTicketPayType } from '@/api/ticket-item/schema';
import { invalidateEventStatus } from '@/features/hosting/shared/model/event-cache';
import { EVENT_ENDED_MESSAGE } from '@/features/hosting/shared/model/event-scope';
import {
  dirtyKeysOf,
  EDIT_FORM_OPTIONS,
  resolverFrom,
  serverErrorOf,
  useClearServerErrors,
  useFieldChange,
} from '@/features/hosting/shared/model/rhf-form';
import {
  applyCreatedTicket,
  applyUpdatedTicket,
  invalidateTickets,
} from '@/features/hosting/shared/model/ticket-cache';
import { useEventScope } from '@/features/hosting/shared/model/useEventScope';

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
  type TicketFormContext,
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
  ended: EVENT_ENDED_MESSAGE,
  noTicketEvent: '티켓 없는 공연이라 티켓을 만들 수 없어요',
  priceTicket: '이 티켓은 두둥 티켓·무료 티켓이 아니라 고칠 수 없어요',
};

type ServerErrors = Partial<Record<TicketFormField, string>>;

/**
 * 서버 칸 → 그 칸을 이루는 값(고치면 서버 오류를 지운다) — 전환 전 `edit(칸, …)`이 지우던 그대로.
 * 무제한은 수량 칸, 판매 기간 토글은 종료 칸, 즉시 판매는 시작 칸을 지운다
 */
const SERVER_FIELDS = {
  payType: ['payType'],
  name: ['name'],
  description: ['description'],
  price: ['price'],
  supplyCount: ['unlimited', 'supplyCount'],
  purchaseLimit: ['limitPurchase', 'purchaseLimit'],
  bankCode: ['bankCode'],
  accountHolder: ['accountHolder'],
  accountNumber: ['accountNumber'],
  saleStart: ['saleStartNow', 'saleStartDate', 'saleStartTime'],
  saleEnd: ['salePeriod', 'saleEndDate', 'saleEndTime'],
} as const satisfies Record<TicketFormField, readonly (keyof TicketFormValues)[]>;
const SERVER_FIELD_NAMES = Object.keys(SERVER_FIELDS) as TicketFormField[];

/**
 * 티켓 폼(`/hosting/events/[eventId]/tickets/new` · `…/tickets/[ticketItemId]`, P10/T-2 · T-3 · 은행 목록, plan P12).
 * RHF(patterns §23 — 무제한 ↔ 재고 공개 · 결제 방식 ↔ 가격 · 판매 기간이 얽힘 · 칸별 서버 에러). 값·칸 잠금·칸 오류·저장만 돌려준다(plan §0). 공연 스코프 레이아웃 안에서 쓴다. 수정은 T-1 목록에서 그 티켓을 찾는다(없으면 `missing`).
 *
 * - 결제 방식 두둥/무료: 무료면 가격·계좌 없음 + 승인 토글을 연다, 두둥이면 승인 켠 채 잠금
 * - 무제한이면 재고 공개를 끄고 비활성(`locks.quantityPublic`) — 기본값 그대로 저장해도 서버가 받는 조합
 * - 잠긴 티켓(`isSold || hasPendingOrders`): 결제 방식·이름·가격·계좌·승인을 바꾸지 않고 수량은 늘리기만(`locks.locked`)
 * - 은행은 목록에서만 고른다(`bank` — `useBankSelect`), 보낼 때는 `bankCode`
 * - 칸은 모두 훅의 동작(`set.*`)으로 바꾼다 — 잠긴 칸은 무시하고, 바꾼 뒤 칸 사이 규칙(`normalizeTicketForm`)을 맞춰 `setValue(…, shouldDirty)`.
 *   검증은 `validateTicketForm`을 resolver로(`rhf-form.ts`), 칸 오류는 [저장]을 한 번 누른 뒤(`formState.isSubmitted`)
 * - 저장: 만들기는 '값 없음' 키를 빼고, 수정은 바뀐 필드만(`dirtyFields` → 값 비교) + 비울 때 `clear[]`. 성공하면 목록 캐시에 넣고(체크리스트 ③·GP-5 무효화)
 *   티켓 목록으로 `replace`
 * - 동의(#840·#873): 두둥 만들기 · 무료 → 두둥 수정에서 사용자가 체크한 `refundObligationAgreed`만 싣는다. 체크 칸은 2026-11-01
 *   붙였다(`agreement.field` true — 위치는 Q42 답 전 잠정). 동의 전 저장을 막는다
 * - 에러(patterns §24 P12): `Ticket_Item_400_3` 가격 · `400_8` 계좌 · `400_13` 판매 기간 · `400_2` 수량 → 칸 오류(`setError('root.<칸>')`, 고치면 지운다).
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

  const form = useForm<TicketFormValues>({
    ...EDIT_FORM_OPTIONS,
    defaultValues: ticket ? ticketFormValuesOf(ticket) : initialTicketFormValues(),
    resolver: resolverFrom((v: TicketFormValues) => validateTicketForm(v, ctx)),
  });
  const values = useWatch({ control: form.control }) as TicketFormValues;
  const { defaultValues, dirtyFields, isDirty, isSubmitted, errors: rhfErrors } = form.formState;
  /** 수정이면 처음 값(저장 뒤 `reset`이 새 기준), 만들기면 null */
  const base = ticket ? (defaultValues as TicketFormValues) : null;
  const dirtyKeys = dirtyKeysOf(dirtyFields);
  useClearServerErrors(form, SERVER_FIELDS);

  const [agreed, setAgreed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // 폼 오류는 어느 칸이든 고치면 지운다(전환 전과 같다)
  useFieldChange(form, () => setFormError(null));
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

  /** 칸을 바꾸고 칸 사이 규칙을 맞춘다 — 달라진 칸만 `setValue`(바뀐 칸 표시) */
  const apply = (patch: Partial<TicketFormValues>) => {
    const current = form.getValues();
    const next = normalizeTicketForm({ ...current, ...patch });
    for (const key of Object.keys(next) as (keyof TicketFormValues)[]) {
      if (next[key] !== current[key]) form.setValue(key, next[key], { shouldDirty: true });
    }
  };
  const setter =
    <K extends keyof TicketFormValues>(key: K) =>
    (value: TicketFormValues[K]) =>
      apply({ [key]: value } as Partial<TicketFormValues>);

  const bank = useBankSelect(values.bankCode, (code) => {
    if (lockedField('bankCode')) return;
    apply({ bankCode: code });
  });

  const ctx: TicketFormContext = {
    base,
    ticket,
    eventStartAt: scope.event.startAt,
    now: formatKstDateTime(now()),
    bankCodes: bank.codes,
    hasPaidOption: ticket?.options.some(isPaidOption) ?? false,
  };
  const errors: TicketFormErrors = validateTicketForm(values, ctx);
  const createMutation = useMutation({
    ...createTicketItemMutation(eventId),
    onSuccess: (created) => applyCreatedTicket(queryClient, eventId, created),
  });
  const updateMutation = useMutation({
    ...updateTicketItemMutation(eventId),
    onSuccess: (updated) => applyUpdatedTicket(queryClient, eventId, updated),
  });
  // 만들기는 성공하면(이동 중) 더 보낼 것이 없다 — 전환 전에는 만든 티켓을 새 기준으로 두어 같은 결과였다
  const dirty =
    base === null
      ? !createMutation.isSuccess
      : isDirty && isTicketFormDirty(base, values, dirtyKeys);
  const agreementRequired = needsRefundObligation(base, values);

  const codes = (() => {
    const field = (code: keyof typeof TICKET_FIELD_ERRORS) => () => {
      const { field: f, message } = TICKET_FIELD_ERRORS[code];
      form.setError(`root.${f}`, { message });
    };
    const formOnly = (code: keyof typeof TICKET_FORM_ERRORS, after?: () => void) => () => {
      setFormError(TICKET_FORM_ERRORS[code]);
      after?.();
    };
    const reloadScope = () => void invalidateEventStatus(queryClient, eventId);
    const reloadList = () => void invalidateTickets(queryClient, eventId);
    return {
      Ticket_Item_400_3: field('Ticket_Item_400_3'),
      Ticket_Item_400_8: field('Ticket_Item_400_8'),
      Ticket_Item_400_13: field('Ticket_Item_400_13'),
      Ticket_Item_400_2: field('Ticket_Item_400_2'),
      Ticket_Item_400_12: formOnly('Ticket_Item_400_12', reloadScope),
      Event_400_17: formOnly('Event_400_17', reloadScope),
      Ticket_Item_400_14: formOnly('Ticket_Item_400_14', reloadList),
      Ticket_Item_404_1: formOnly('Ticket_Item_404_1', reloadList),
      Ticket_Item_400_15: formOnly('Ticket_Item_400_15'),
      Ticket_Item_400_11: formOnly('Ticket_Item_400_11'),
      Item_Option_Group_400_4: formOnly('Item_Option_Group_400_4'),
      // 서버가 동의를 거절 — 체크를 풀고 지금 보이는 문구로 다시 체크받는다(저장 버튼이 다시 막힌다)
      Agreement_400_1: formOnly('Agreement_400_1', () => setAgreed(false)),
    };
  })();

  const saving = createMutation.isPending || updateMutation.isPending;
  const agreementMissing = REFUND_OBLIGATION_FIELD && agreementRequired && !agreed;
  const canSave = canEdit && !saving && dirty && !hasTicketFormErrors(errors) && !agreementMissing;

  /** 저장했으면 `true`. 고칠 수 없음·바뀐 것 없음·칸 오류·동의 전·저장 중이면 요청하지 않고 `false` */
  const save = async () => {
    const result = await form.handleSubmit(async (valid) => {
      if (!canSave || inflight.current) return;
      inflight.current = true;
      setFormError(null);
      const agreements = { refundObligationAgreed: agreed };
      try {
        if (base === null || ticket === null) {
          await createMutation.mutateAsync(toCreateTicketBody(valid, agreements));
          return { saved: null };
        }
        const body = toUpdateTicketBody(base, valid, agreements, dirtyKeys);
        if (!body) return;
        const updated = await updateMutation.mutateAsync({
          ticketItemId: ticket.ticketItemId,
          body,
        });
        return { saved: ticketFormValuesOf(updated) };
      } catch (e) {
        handleError(e, codes);
        return;
      } finally {
        inflight.current = false;
      }
    })();
    if (!result) return false;
    // `handleSubmit`이 끝난 뒤에 새 기준으로 — 그래야 `isSubmitted`(칸 오류 표시)도 풀린다
    if (result.saved) form.reset(result.saved);
    router.replace(ticketsHref(eventId));
    return true;
  };

  const guarded =
    <A extends unknown[]>(
      field: TicketFormField | 'approval' | 'unlimited',
      fn: (...a: A) => void,
    ) =>
    (...a: A) => {
      if (!lockedField(field)) fn(...a);
    };

  const serverErrors: ServerErrors = {};
  for (const f of SERVER_FIELD_NAMES) {
    const message = serverErrorOf(rhfErrors, f);
    if (message) serverErrors[f] = message;
  }

  return {
    event: scope.event,
    /** 수정이면 그 티켓(T-1), 만들기면 null */
    ticket,
    /** 주소의 티켓이 목록에 없다(지웠거나 다른 공연) — 공용 404(V) */
    missing,
    mode: ticketItemId === null ? ('create' as const) : ('edit' as const),
    access: {
      canEdit,
      readOnlyReason,
      readOnlyMessage: readOnlyReason ? TICKET_FORM_READ_ONLY_MESSAGE[readOnlyReason] : null,
    },
    /** 지금 값(RHF) */
    values,
    /** 칸 잠금 — `locked`(잠긴 티켓의 결제 방식·이름·가격·계좌·승인), `quantityPublic`(무제한), `approval`(두둥·잠김), `limitedSupply` */
    locks,
    /** 칸 바꾸기 — 잠긴 칸은 무시하고 칸 사이 규칙을 맞춘다 */
    set: {
      payType: guarded('payType', setter('payType') as (payType: EditableTicketPayType) => void),
      name: guarded('name', setter('name')),
      description: guarded('description', setter('description')),
      price: guarded('price', setter('price')),
      unlimited: guarded('unlimited', (unlimited: boolean) => {
        if (!unlimited && locks.limitedSupply) return;
        apply({ unlimited });
      }),
      supplyCount: guarded('supplyCount', setter('supplyCount')),
      quantityPublic: guarded('supplyCount', (on: boolean) => {
        if (locks.quantityPublic) return;
        apply({ isQuantityPublic: on });
      }),
      limitPurchase: guarded('purchaseLimit', setter('limitPurchase')),
      purchaseLimit: guarded('purchaseLimit', setter('purchaseLimit')),
      approvalRequired: guarded('approval', setter('approvalRequired')),
      accountHolder: guarded('accountHolder', setter('accountHolder')),
      accountNumber: guarded('accountNumber', setter('accountNumber')),
      salePeriod: guarded('saleEnd', setter('salePeriod')),
      saleStartNow: guarded('saleStart', setter('saleStartNow')),
      saleStart: guarded('saleStart', (date: string, time: string) =>
        apply({ saleStartDate: date, saleStartTime: time }),
      ),
      saleEnd: guarded('saleEnd', (date: string, time: string) =>
        apply({ saleEndDate: date, saleEndTime: time }),
      ),
    },
    /** 은행 목록 · 검색 · 고르기(V에서 Combobox) */
    bank,
    /**
     * 환불 의무 동의(#840·#873) — `required`: 이 저장에 동의가 필요한지(두둥 만들기·무료 → 두둥). `field`: 체크 칸이 있는지
     * (2026-11-01 붙임 — 위치는 Q42 답 전 잠정). `agreed`·`setAgreed`: 사용자가 체크한 값
     */
    agreement: {
      field: REFUND_OBLIGATION_FIELD,
      required: agreementRequired,
      agreed,
      setAgreed,
    },
    /** 칸 오류(`errors` — 지금 값), 칸에 붙은 서버 오류(`server` — 그 칸을 고치면 지운다), 폼 전체 오류(`form` — 서버) */
    feedback: { errors, server: serverErrors, form: formError },
    status: {
      /** [저장]을 한 번이라도 눌렀는지(`formState.isSubmitted`) */
      attempted: isSubmitted,
      /** 보낼 변경이 있는지(만들기는 늘 true) */
      dirty,
      /** 처음 값에서 손댔는지(이탈 확인 — 만들기는 `formState.isDirty`, 수정은 `dirty`) */
      touched: base === null ? isDirty : dirty,
      saving,
      canSave,
    },
    save,
    listHref: ticketsHref(eventId),
  };
}
