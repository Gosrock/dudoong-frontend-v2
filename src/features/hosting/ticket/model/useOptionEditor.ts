'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { deleteOptionMutation, updateOptionMutation } from '@/api/option/mutations';
import { eventOptionsQuery } from '@/api/option/queries';
import type { TicketOptionManage } from '@/api/option/schema';
import { handleError, settle } from '@/api/settle';
import { useEventScope } from '@/features/hosting/event/model/useEventScope';

import {
  hasOptionFormErrors,
  OPTION_FIELD_ERRORS,
  type OptionFormField,
  type OptionFormValues,
  optionFormValuesOf,
  toUpdateOptionBody,
  validateOptionForm,
} from './option-form';
import { applyDeletedOption, applyUpdatedOption, invalidateOptions } from './ticket-cache';

/** 옵션 상세 오류 문구(patterns §24 P12 — 잠정) */
export const OPTION_EDITOR_ERRORS = {
  locked:
    '판매되었거나 승인 대기 주문이 있는 티켓에 붙은 옵션은 이름·설명만 고칠 수 있고 지울 수 없어요',
  Option_Group_404_1: '옵션을 찾을 수 없어요. 옵션 목록을 다시 불러왔어요',
  Event_400_17: '끝난 공연은 수정할 수 없어요',
} as const;

/**
 * 옵션 상세 · 수정 · 삭제(P10/O-3 · D10/O-4, plan P12). 값·동작만 돌려준다(plan §0). 옵션 풀(O-1)에서 그 옵션을 찾는다.
 *
 * - **응답 형식은 읽기 전용**(`type` — 수정 본문에 없다, 서버가 막는다). 객관식(v1) 옵션도 보여 주기만 한다
 * - 잠긴 옵션(`isLocked` — 판매·승인 대기 티켓에 붙음)은 이름·설명만(`priceLocked`), 삭제 없음(`canDelete` false)
 * - 설명은 필수, 50자는 바뀐 때만 검사(v1의 긴 설명은 그대로 둘 수 있다)
 * - 삭제는 옵션 자체를 지운다(붙은 판매 전 티켓에서도 떨어진다) — 이 티켓에서만 빼는 것은 `useTicketOptions.detach`
 * - 성공: 수정은 응답을 풀에, 삭제는 남은 풀을 넣고, 티켓 목록(붙은 옵션 이름·추가금)·관객 GP-5를 무효화
 * - 에러: `Option_Group_400_6` 설명 · `400_3`·`Item_Option_Group_400_4` 추가금 → 칸 오류, `Option_Group_400_5`·`400_2` 잠김 →
 *   안내 + 풀 다시 읽기, 404 → 안내 + 풀 다시 읽기, `Event_400_17` → 안내. 그 밖은 공용 토스트(handleError)
 */
export function useOptionEditor(eventId: string, optionId: number) {
  const queryClient = useQueryClient();
  const scope = useEventScope(eventId);
  const pool = useQuery(eventOptionsQuery(eventId));
  const option: TicketOptionManage | null = pool.data?.find((o) => o.optionId === optionId) ?? null;

  const [base, setBase] = useState<OptionFormValues | null>(null);
  const [values, setValues] = useState<OptionFormValues | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<OptionFormField, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const inflight = useRef(false);

  // 풀이 오면 처음 값을 한 번 채운다(옵션이 바뀌면 다시)
  const [seededFor, setSeededFor] = useState<number | null>(null);
  if (option && seededFor !== option.optionId) {
    setSeededFor(option.optionId);
    const v = optionFormValuesOf(option);
    setBase(v);
    setValues(v);
  }

  const canEdit = scope.canEdit && option !== null;
  const locked = option?.isLocked ?? false;
  const yesNo = option?.type === 'YES_NO';

  const lockedError = () => {
    setError(OPTION_EDITOR_ERRORS.locked);
    void invalidateOptions(queryClient, eventId);
  };
  const codes = {
    ...Object.fromEntries(
      Object.entries(OPTION_FIELD_ERRORS).map(([code, { field, message }]) => [
        code,
        () => setServerErrors((prev) => ({ ...prev, [field]: message })),
      ]),
    ),
    Option_Group_400_5: lockedError,
    Option_Group_400_2: lockedError,
    Option_Group_404_1: () => {
      setError(OPTION_EDITOR_ERRORS.Option_Group_404_1);
      void invalidateOptions(queryClient, eventId);
    },
    Event_400_17: () => setError(OPTION_EDITOR_ERRORS.Event_400_17),
  };

  const updateMutation = useMutation({
    ...updateOptionMutation(eventId),
    onSuccess: (saved) => applyUpdatedOption(queryClient, eventId, saved),
  });
  const deleteMutation = useMutation({
    ...deleteOptionMutation(eventId),
    onSuccess: async (remaining) => {
      // 풀에서 빠지기 전에 세운다 — 늦으면 그사이 `missing`(풀에 없음)으로 보인다
      setDeleted(true);
      await applyDeletedOption(queryClient, eventId, remaining);
    },
  });

  const errors = values ? validateOptionForm(values, { base }) : {};
  const body = base && values ? toUpdateOptionBody(base, values, { locked, yesNo }) : null;
  const busy = updateMutation.isPending || deleteMutation.isPending;
  const canSave = canEdit && !busy && body !== null && !hasOptionFormErrors(errors);

  const save = async () => {
    setAttempted(true);
    if (!canSave || !body || inflight.current) return false;
    inflight.current = true;
    setError(null);
    const r = await settle(updateMutation.mutateAsync({ optionId, body }));
    inflight.current = false;
    if (!r.ok) {
      handleError(r.error, codes);
      return false;
    }
    const v = optionFormValuesOf(r.data);
    setBase(v);
    setValues(v);
    setAttempted(false);
    setServerErrors({});
    return true;
  };

  const canDelete = canEdit && !locked;
  const remove = async () => {
    if (!canDelete || busy || inflight.current) return false;
    inflight.current = true;
    setError(null);
    const r = await settle(deleteMutation.mutateAsync(optionId));
    inflight.current = false;
    if (r.ok) return true;
    handleError(r.error, codes);
    return false;
  };

  const edit = (field: OptionFormField, update: (v: OptionFormValues) => OptionFormValues) => {
    if (!canEdit) return;
    setServerErrors((prev) => ({ ...prev, [field]: undefined }));
    setValues((v) => (v ? update(v) : v));
  };

  return {
    status: pool.status,
    /** 풀에 없다(지웠거나 다른 공연) */
    missing: pool.status === 'success' && option === null && !deleted,
    option,
    canEdit,
    values,
    /** 응답 형식(읽기 전용) */
    type: option?.type ?? null,
    /** 잠긴 옵션 — 추가금 칸 비활성 */
    priceLocked: locked,
    setName: (name: string) => edit('name', (v) => ({ ...v, name })),
    setDescription: (description: string) => edit('description', (v) => ({ ...v, description })),
    setYesAdditionalPrice: (yesAdditionalPrice: string) => {
      if (locked || !yesNo) return;
      edit('yesAdditionalPrice', (v) => ({ ...v, yesAdditionalPrice }));
    },
    errors,
    serverErrors,
    attempted,
    dirty: body !== null,
    canSave,
    save,
    /** 옵션 자체 삭제(상세 하단 [삭제] — Figma 424:10455에 없어 기본안, 잠긴 옵션이면 숨김) */
    canDelete,
    remove,
    deleted,
    busy,
    error,
  };
}
