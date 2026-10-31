'use client';

import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { handleError } from '@/api/handle-error';
import { createOptionMutation } from '@/api/option/mutations';
import { eventOptionsQuery } from '@/api/option/queries';
import type { TicketOptionManage } from '@/api/option/schema';
import { replaceTicketOptionsMutation } from '@/api/ticket-item/mutations';
import { ticketItemsManageQuery } from '@/api/ticket-item/queries';
import { useEventScope } from '@/features/hosting/event/model/useEventScope';
import { tryCatch } from '@/utils/try-catch';

import {
  hasOptionFormErrors,
  initialOptionFormValues,
  OPTION_FIELD_ERRORS,
  type OptionFormField,
  type OptionFormValues,
  toCreateOptionBody,
  validateOptionForm,
} from './option-form';
import {
  applyCreatedOption,
  applyTicketOptions,
  invalidateOptions,
  invalidateTickets,
} from './ticket-cache';
import { attachableOptionsOf, canAttachMoreOptions, canChangeTicketOptions } from './ticket-rules';

/** 붙이기·떼기 오류 문구(patterns §24 P12 — 잠정) */
export const TICKET_OPTION_ERRORS = {
  Item_Option_Group_400_2: '판매되었거나 승인 대기 주문이 있는 티켓은 옵션을 바꿀 수 없어요',
  Item_Option_Group_400_4: '무료 티켓에는 추가 금액이 있는 옵션을 붙일 수 없어요',
  Option_Group_400_1: '이 공연의 옵션이 아니에요. 옵션 목록을 다시 불러왔어요',
  Option_Group_404_1: '옵션을 찾을 수 없어요. 옵션 목록을 다시 불러왔어요',
  Ticket_Item_404_1: '티켓을 찾을 수 없어요. 목록을 다시 불러왔어요',
  Event_400_17: '끝난 공연은 수정할 수 없어요',
  /** 새 옵션: 만들기(O-2)는 됐고 붙이기(O-5)가 실패 — 옵션은 풀에 남아 있다(patterns §23) */
  partial: '옵션은 만들어졌지만 티켓에 붙이지 못했어요. 다시 붙여 주세요',
} as const;

/** 새 옵션 만들기 + 붙이기 결과 */
export type CreateAndAttachResult = 'attached' | 'createdOnly' | 'failed';

/**
 * 한 티켓의 옵션(목록 카드 [티켓 옵션 추가] — GUI `767:50048`, plan P12). 기존 옵션 붙이기·떼기(P10/O-5)와
 * 새 옵션 만들기(P10/O-2) + 붙이기(P10/O-5)를 한 동작으로. 값·동작만 돌려준다(plan §0). 공연 스코프 레이아웃 안에서 쓴다.
 *
 * - 떼기(`detach`)는 이 티켓에서만 뺀다 — 옵션 자체 삭제(D10/O-4)는 `useOptionEditor.remove`
 * - 잠긴 티켓(`isSold || hasPendingOrders`)은 붙이기·떼기를 하지 않는다(`canChange` false — 서버 `Item_Option_Group_400_2`)
 * - 무료 티켓에는 유료 옵션을 선택지에서 빼고(`attachable`), 새 옵션도 추가금 0만 받는다
 * - 티켓당 10개(`canAttachMore`)
 * - 새 옵션: O-2 성공 → 풀에 넣고 → O-5. O-5가 실패하면 `createAndAttach()`가 `'createdOnly'`, `partial`에 그 옵션 —
 *   `retryAttach()`로 다시 붙인다(만든 옵션은 풀에 남는다, patterns §23). O-2가 실패하면 `'failed'`
 * - 에러: `Item_Option_Group_400_2` → 목록 다시 읽기(잠김 반영), `Option_Group_400_1`·404 → 풀 다시 읽기, 그 밖 표의 코드는 `error`
 */
export function useTicketOptions(eventId: string, ticketItemId: number) {
  const queryClient = useQueryClient();
  const scope = useEventScope(eventId);
  const { data: tickets } = useSuspenseQuery(ticketItemsManageQuery(eventId));
  const pool = useQuery(eventOptionsQuery(eventId));
  const ticket = tickets.find((t) => t.ticketItemId === ticketItemId) ?? null;

  const [error, setError] = useState<string | null>(null);
  const [partial, setPartial] = useState<TicketOptionManage | null>(null);
  const [values, setValues] = useState<OptionFormValues>(initialOptionFormValues);
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<OptionFormField, string>>>({});
  const inflight = useRef(false);

  const canChange = ticket !== null && canChangeTicketOptions(ticket, scope.canEdit);
  const options = pool.data ?? [];
  const attachable = ticket ? attachableOptionsOf(ticket, options) : [];
  const canAttachMore = ticket !== null && canAttachMoreOptions(ticket);

  const show = (code: keyof typeof TICKET_OPTION_ERRORS, reload?: () => unknown) => () => {
    setError(TICKET_OPTION_ERRORS[code]);
    void reload?.();
  };
  const replaceCodes = {
    Item_Option_Group_400_2: show('Item_Option_Group_400_2', () =>
      invalidateTickets(queryClient, eventId),
    ),
    Item_Option_Group_400_4: show('Item_Option_Group_400_4'),
    Option_Group_400_1: show('Option_Group_400_1', () => invalidateOptions(queryClient, eventId)),
    Option_Group_404_1: show('Option_Group_404_1', () => invalidateOptions(queryClient, eventId)),
    Ticket_Item_404_1: show('Ticket_Item_404_1', () => invalidateTickets(queryClient, eventId)),
    Event_400_17: show('Event_400_17'),
  };
  const replaceMutation = useMutation({
    ...replaceTicketOptionsMutation(eventId),
    onSuccess: (t) => applyTicketOptions(queryClient, eventId, t),
  });

  const createCodes = {
    ...Object.fromEntries(
      Object.entries(OPTION_FIELD_ERRORS).map(([code, { field, message }]) => [
        code,
        () => setServerErrors((prev) => ({ ...prev, [field]: message })),
      ]),
    ),
    Event_400_17: () => setError(TICKET_OPTION_ERRORS.Event_400_17),
  };
  const createMutation = useMutation({
    ...createOptionMutation(eventId),
    onSuccess: (o) => applyCreatedOption(queryClient, eventId, o),
  });

  /** 지금 붙은 목록을 `next`로 바꾼다(O-5). 끝나면 `true` */
  const replace = async (next: number[]) => {
    if (!ticket || !canChange || inflight.current) return false;
    inflight.current = true;
    setError(null);
    try {
      await replaceMutation.mutateAsync({
        ticketItemId: ticket.ticketItemId,
        body: { optionIds: next },
      });
      return true;
    } catch (e) {
      handleError(e, replaceCodes);
      return false;
    } finally {
      inflight.current = false;
    }
  };

  const attachedIds = ticket?.options.map((o) => o.optionId) ?? [];

  /** 기존 옵션 붙이기 — 선택지(`attachable`)에 있는 것만 */
  const attach = (optionId: number) => {
    if (!canAttachMore || !attachable.some((o) => o.optionId === optionId)) {
      return Promise.resolve(false);
    }
    return replace([...attachedIds, optionId]);
  };

  /** 이 티켓에서만 떼기(옵션은 풀에 남는다) */
  const detach = async (optionId: number) => {
    if (!attachedIds.includes(optionId)) return false;
    const ok = await replace(attachedIds.filter((id) => id !== optionId));
    if (ok && partial?.optionId === optionId) setPartial(null);
    return ok;
  };

  const freeTicket = ticket?.payType === 'FREE';
  const formErrors = validateOptionForm(values, { freeTicket });

  /** 새 옵션 만들기(O-2) + 이 티켓에 붙이기(O-5) — 한 동작 */
  const createAndAttach = async (): Promise<CreateAndAttachResult> => {
    setAttempted(true);
    if (!ticket || !canChange || !canAttachMore || hasOptionFormErrors(formErrors)) return 'failed';
    if (inflight.current) return 'failed';
    inflight.current = true;
    setError(null);
    setPartial(null);
    const [created, createError] = await tryCatch(
      createMutation.mutateAsync(toCreateOptionBody(values)),
    );
    if (createError) {
      inflight.current = false;
      handleError(createError, createCodes);
      return 'failed';
    }
    // 만들었다 — 폼을 비우고 붙인다. 붙이기가 실패해도 옵션은 풀에 남는다
    setValues(initialOptionFormValues());
    setAttempted(false);
    setServerErrors({});
    const [, attachError] = await tryCatch(
      replaceMutation.mutateAsync({
        ticketItemId: ticket.ticketItemId,
        body: { optionIds: [...attachedIds, created.optionId] },
      }),
    );
    inflight.current = false;
    if (!attachError) return 'attached';
    // 표의 처리(다시 읽기)는 하고, 안내는 "만들었지만 못 붙임"으로 덮는다
    handleError(attachError, replaceCodes);
    setPartial(created);
    setError(TICKET_OPTION_ERRORS.partial);
    return 'createdOnly';
  };

  /** 만들고 붙이지 못한 옵션을 다시 붙인다 */
  const retryAttach = async () => {
    if (!partial) return false;
    const ok = await replace([...attachedIds, partial.optionId]);
    if (ok) setPartial(null);
    return ok;
  };

  const edit = (
    field: OptionFormField | null,
    update: (v: OptionFormValues) => OptionFormValues,
  ) => {
    if (field) setServerErrors((prev) => ({ ...prev, [field]: undefined }));
    setValues(update);
  };

  return {
    ticket,
    /** 붙이기·떼기를 할 수 있는지(쓰기 가능 + 잠기지 않은 티켓) */
    canChange,
    /** 붙은 옵션(id 순) */
    attached: ticket?.options ?? [],
    /** 옵션 풀 상태(O-1) */
    poolStatus: pool.status,
    retryPool: () => void pool.refetch(),
    /** 붙일 수 있는 기존 옵션(이미 붙은 것·무료 티켓의 유료 옵션 제외) */
    attachable,
    canAttachMore,
    attach,
    detach,
    // 새 옵션
    values,
    setName: (name: string) => edit('name', (v) => ({ ...v, name })),
    setDescription: (description: string) => edit('description', (v) => ({ ...v, description })),
    setType: (type: OptionFormValues['type']) =>
      edit('yesAdditionalPrice', (v) => ({ ...v, type })),
    setYesAdditionalPrice: (yesAdditionalPrice: string) =>
      edit('yesAdditionalPrice', (v) => ({ ...v, yesAdditionalPrice })),
    errors: formErrors,
    serverErrors,
    attempted,
    createAndAttach,
    /** 만들었지만 붙이지 못한 옵션 */
    partial,
    retryAttach,
    pending: replaceMutation.isPending || createMutation.isPending,
    error,
    dismissError: () => setError(null),
  };
}
