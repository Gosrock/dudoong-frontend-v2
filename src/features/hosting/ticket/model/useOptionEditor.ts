'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { handleError, handlersFrom } from '@/api/handle-error';
import { deleteOptionMutation, updateOptionMutation } from '@/api/option/mutations';
import { eventOptionsQuery } from '@/api/option/queries';
import type { TicketOptionManage } from '@/api/option/schema';
import { invalidateEventStatus } from '@/features/hosting/shared/model/event-cache';
import { EVENT_ENDED_MESSAGE } from '@/features/hosting/shared/model/event-scope';
import {
  applyDeletedOption,
  applyUpdatedOption,
  invalidateOptions,
} from '@/features/hosting/shared/model/ticket-cache';
import { useEventScope } from '@/features/hosting/shared/model/useEventScope';

import {
  hasOptionFormErrors,
  OPTION_FIELD_ERRORS,
  optionFormValuesOf,
  toUpdateOptionBody,
  validateOptionForm,
} from './option-form';
import { useOptionForm } from './useOptionForm';

/** 옵션 상세 오류 문구(patterns §24 P12 — 잠정) */
export const OPTION_EDITOR_ERRORS = {
  locked:
    '판매되었거나 승인 대기 주문이 있는 티켓에 붙은 옵션은 이름·설명만 고칠 수 있고 지울 수 없어요',
  Option_Group_404_1: '옵션을 찾을 수 없어요. 옵션 목록을 다시 불러왔어요',
  Event_400_17: EVENT_ENDED_MESSAGE,
} as const;

/**
 * 옵션 상세 · 수정 · 삭제(P10/O-3 · D10/O-4, plan P12). 값·동작만 돌려준다(plan §0). 옵션 풀(O-1)에서 그 옵션을 찾는다.
 *
 * - **응답 형식은 읽기 전용**(`type` — 수정 본문에 없다, 서버가 막는다). 객관식(v1) 옵션도 보여 주기만 한다
 * - 잠긴 옵션(`isLocked` — 판매·승인 대기 티켓에 붙음)은 이름·설명만(`priceLocked`), 삭제 없음(`canDelete` false)
 * - 폼: RHF(`useOptionForm` — 칸별 서버 에러). 풀이 오면 그 옵션 값으로 **한 번** 채운다(`reset` — 처음 채우기라 편집 중인 값을 덮지 않는다,
 *   옵션 id가 바뀔 때만 다시). 그 밖의 `reset`은 저장 성공 뒤와 [닫기](고친 값 버리기)뿐
 * - 설명은 필수, 50자는 바뀐 때만 검사(v1의 긴 설명은 그대로 둘 수 있다)
 * - 삭제는 옵션 자체를 지운다(붙은 판매 전 티켓에서도 떨어진다) — 이 티켓에서만 빼는 것은 `useTicketOptions.detach`
 * - 성공: 수정은 응답을 풀에, 삭제는 남은 풀을 넣고, 티켓 목록(붙은 옵션 이름·추가금)·관객 GP-5를 무효화
 * - 에러: `Option_Group_400_6` 설명 · `400_3`·`Item_Option_Group_400_4` 추가금 → 칸 오류(`setError('root.<칸>')`), `Option_Group_400_5`·`400_2` 잠김 →
 *   안내 + 풀 다시 읽기, 404 → 안내 + 풀 다시 읽기, `Event_400_17` → 안내 + GE-3 다시 읽기(읽기 전용으로 — A2). 그 밖은 공용 토스트(handleError)
 */
export function useOptionEditor(eventId: string, optionId: number) {
  const queryClient = useQueryClient();
  const scope = useEventScope(eventId);
  const pool = useQuery(eventOptionsQuery(eventId));
  const option: TicketOptionManage | null = pool.data?.find((o) => o.optionId === optionId) ?? null;

  const canEdit = scope.canEdit && option !== null;
  const locked = option?.isLocked ?? false;
  const yesNo = option?.type === 'YES_NO';

  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const inflight = useRef(false);

  const fields = useOptionForm((v, base) => validateOptionForm(v, { base }), {
    fields: canEdit,
    price: !locked && yesNo,
  });
  const { form, base, dirtyKeys } = fields;

  // 풀이 오면 처음 값을 한 번 채운다(옵션이 바뀌면 다시) — 채우기 전에는 폼을 돌려주지 않는다
  const [seededFor, setSeededFor] = useState<number | null>(null);
  const optionToSeed = option && seededFor !== option.optionId ? option : null;
  useEffect(() => {
    if (!optionToSeed) return;
    form.reset(optionFormValuesOf(optionToSeed));
    // 채운 뒤에야 폼을 돌려준다 — 렌더 중에 `reset`하면 RHF 구독이 렌더 도중에 바뀌고, 먼저 돌려주면 빈 값으로 한 번 그려진다
    // (`OptionFields`의 가격 토글 처음 값이 빈 값으로 굳는다)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeededFor(optionToSeed.optionId);
  }, [form, optionToSeed]);
  const seeded = option !== null && seededFor === option.optionId;

  const lockedError = () => {
    setError(OPTION_EDITOR_ERRORS.locked);
    void invalidateOptions(queryClient, eventId);
  };
  const codes = {
    ...handlersFrom(OPTION_FIELD_ERRORS, ({ field, message }) =>
      fields.setServerError(field, message),
    ),
    Option_Group_400_5: lockedError,
    Option_Group_400_2: lockedError,
    Option_Group_404_1: () => {
      setError(OPTION_EDITOR_ERRORS.Option_Group_404_1);
      void invalidateOptions(queryClient, eventId);
    },
    Event_400_17: () => {
      setError(OPTION_EDITOR_ERRORS.Event_400_17);
      void invalidateEventStatus(queryClient, eventId);
    },
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

  const values = fields.api.values;
  const body = seeded ? toUpdateOptionBody(base, values, { locked, yesNo }, dirtyKeys) : null;
  const busy = updateMutation.isPending || deleteMutation.isPending;
  const canSave = canEdit && !busy && body !== null && !hasOptionFormErrors(fields.api.errors);

  const save = async () => {
    const updated = await form.handleSubmit(async () => {
      if (!canSave || !body || inflight.current) return;
      inflight.current = true;
      setError(null);
      try {
        return await updateMutation.mutateAsync({ optionId, body });
      } catch (e) {
        handleError(e, codes);
        return;
      } finally {
        inflight.current = false;
      }
    })();
    if (!updated) return false;
    // `handleSubmit`이 끝난 뒤에 새 기준으로 — 그래야 `isSubmitted`(칸 오류 표시)도 풀린다
    form.reset(optionFormValuesOf(updated));
    return true;
  };

  const canDelete = canEdit && !locked;
  const remove = async () => {
    if (!canDelete || busy || inflight.current) return false;
    inflight.current = true;
    setError(null);
    try {
      await deleteMutation.mutateAsync(optionId);
      return true;
    } catch (e) {
      handleError(e, codes);
      return false;
    } finally {
      inflight.current = false;
    }
  };

  return {
    status: pool.status,
    /** 풀에 없다(지웠거나 다른 공연) */
    missing: pool.status === 'success' && option === null && !deleted,
    option,
    canEdit,
    /** 옵션 칸(값 · 바꾸기 · 칸 오류 · 서버 오류 · attempted) — 채우기 전(풀을 받기 전)에는 null */
    fields: seeded ? fields.api : null,
    /** 응답 형식(읽기 전용) */
    type: option?.type ?? null,
    /** 잠긴 옵션 — 추가금 칸 비활성 */
    priceLocked: locked,
    dirty: body !== null,
    /** 고친 값을 버리고 처음 값으로(수정 시트를 닫을 때 — GUI `944:2455` 닫기 확인 뒤) */
    reset: () => {
      form.reset();
      setError(null);
    },
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
