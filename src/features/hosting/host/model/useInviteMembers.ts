'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';

import { handleError, handlersFrom } from '@/api/handle-error';
import { addHostMembersMutation } from '@/api/host/mutations';
import type { AssignableHostRole } from '@/api/host/schema';
import { applyMembers, invalidateHostSummary } from '@/features/hosting/shared/model/host-cache';
import {
  EDIT_FORM_OPTIONS,
  resolverFrom,
  serverErrorOf,
  useFieldChange,
} from '@/features/hosting/shared/model/rhf-form';
import type { ActorRole } from '@/features/shared/permission/model/can';

import {
  canAddInviteRow,
  canRemoveInviteRow,
  emptyInviteRow,
  INVITE_ERROR_MESSAGE,
  type InviteErrorCode,
  inviteRoleOptions,
  type InviteRow,
  inviteRowErrors,
  inviteServerErrors,
  toAddMembersBody,
} from './member-rules';

type InviteValues = { rows: InviteRow[] };

const initialInviteValues = (): InviteValues => ({ rows: [emptyInviteRow()] });
/** 줄 서버 오류 자리(`root.row<i>`) — 줄 수가 바뀌면 모두 지운다 */
const rowErrorKey = (index: number) => `row${index}` as const;

/**
 * 멤버 초대(PH-7, plan P10b). 값·줄별 오류·제출만 돌려준다(초대 모달은 V). V는 한 줄만 그리지만(와이어 `503:32779` — 한 명씩)
 * L은 PH-7이 받는 1~20줄과 줄별 실패 매핑을 그대로 둔다.
 *
 * - 폼: RHF(patterns §23 — 행 반복 · 행별 서버 에러). 줄은 `useFieldArray`, 검증은 `inviteRowErrors`를 resolver로(`rhf-form.ts`)
 * - 역할: `roleOptions`는 마스터 = 매니저·일반, **매니저 = "일반" 고정**(`setRole`이 다른 값을 무시한다). 기본값 "일반"
 * - 제출: 칸 오류(빈칸·이메일 모양·같은 이메일 두 번)가 있으면 요청하지 않는다. 요청 중에는 다시 보내지 않는다
 * - 성공: 응답(변경 뒤 멤버 전체 목록)을 GH-6 키에 넣고 멤버 수가 바뀐 GH-3 두 키를 무효화한 뒤, 폼을 한 줄로 비운다. `submit()`이 `true`
 * - 실패(patterns §24 P10b): `HOST_400_13`·`14`·`15`·`18` → `reason`의 이메일과 같은 줄에 사유(`rowErrors`). 맞는 줄이 없으면 `formError`
 *   (`setError('root.row<i>')` · `setError('root.form')`).
 *   그 줄을 고치면 그 줄의 서버 오류를 지운다. 그 밖(400 `BAD_REQUEST`·403 등)은 공용 토스트(handleError)
 */
export function useInviteMembers(hostId: string, myRole: ActorRole | null | undefined) {
  const queryClient = useQueryClient();
  const roleOptions = useMemo(() => inviteRoleOptions(myRole), [myRole]);
  const form = useForm<InviteValues>({
    ...EDIT_FORM_OPTIONS,
    defaultValues: initialInviteValues(),
    resolver: resolverFrom((v) => ({ rows: inviteRowErrors(v.rows) })),
  });
  const rowKeys = useFieldArray({ control: form.control, name: 'rows' });
  const { rows } = useWatch({ control: form.control }) as InviteValues;
  const { isSubmitted, errors: formErrors } = form.formState;
  const inflight = useRef(false);

  // 한 줄을 고치면 그 줄의 서버 오류와 폼 오류를, 줄을 더하거나 빼면(지난 실패의 줄 매핑이 어긋난다) 서버 오류를 모두 지운다
  useFieldChange(form, (name) => {
    const [, index] = name.split('.');
    if (index === undefined) return form.clearErrors('root');
    form.clearErrors('root.form');
    form.clearErrors(`root.${rowErrorKey(Number(index))}`);
  });

  // 목록 반영·무효화는 화면이 사라져도 해야 하므로 옵션의 onSuccess에 둔다
  const mutation = useMutation({
    ...addHostMembersMutation(hostId),
    onSuccess: async (list) => {
      applyMembers(queryClient, hostId, list);
      await invalidateHostSummary(queryClient, hostId);
    },
  });

  /** 초대했으면 `true`. 초대할 수 없는 역할·칸 오류·요청 중이면 요청하지 않고 `false` */
  const submit = useCallback(async () => {
    const invited = await form.handleSubmit(async (valid) => {
      if (roleOptions.length === 0 || inflight.current) return false;
      inflight.current = true;
      try {
        await mutation.mutateAsync(toAddMembersBody(valid.rows));
        return true;
      } catch (error) {
        // 표에 없는 실패는 공용 토스트
        handleError(
          error,
          handlersFrom(INVITE_ERROR_MESSAGE, (_message, code, e) => {
            // 방금 보낸 줄에 맞춘다
            const mapped = inviteServerErrors(code as InviteErrorCode, e.reason, valid.rows);
            mapped.rows.forEach((message, i) => {
              if (message) form.setError(`root.${rowErrorKey(i)}`, { message });
            });
            if (mapped.form) form.setError('root.form', { message: mapped.form });
          }),
        );
        return false;
      } finally {
        inflight.current = false;
      }
    })();
    if (!invited) return false;
    // `handleSubmit`이 끝난 뒤에 한 줄로 비운다 — 그래야 `isSubmitted`(칸 오류 표시)도 풀린다
    form.reset(initialInviteValues());
    return true;
  }, [form, mutation, roleOptions.length]);

  return {
    /** RHF 폼 — 이메일은 `register`(V) */
    form,
    /** 지금 줄 값 */
    rows,
    /** 줄 키(`id`) */
    rowKeys: rowKeys.fields,
    /** 매니저는 "일반" 고정 — 고를 수 없는 역할은 무시한다 */
    setRole: (index: number, role: AssignableHostRole) => {
      if (roleOptions.includes(role)) {
        form.setValue(`rows.${index}.role`, role, { shouldDirty: true });
      }
    },
    addRow: () => {
      if (canAddInviteRow(form.getValues('rows'))) rowKeys.append(emptyInviteRow());
    },
    removeRow: (index: number) => {
      if (canRemoveInviteRow(form.getValues('rows'))) rowKeys.remove(index);
    },
    canAddRow: canAddInviteRow(rows),
    canRemoveRow: canRemoveInviteRow(rows),
    /** 고를 수 있는 역할(매니저는 `['GUEST']`). 비면 초대할 수 없다 */
    roleOptions,
    /** 줄마다 칸 오류(빈칸·이메일 모양·같은 이메일). 언제 보일지는 `attempted`를 기준으로 V가 정한다 */
    errors: inviteRowErrors(rows),
    /** 줄마다 서버 실패 사유(`HOST_400_13`·`14`·`15`·`18`). 그 줄을 고치면 지운다 */
    serverErrors: rows.map((_, i) => serverErrorOf(formErrors, rowErrorKey(i))),
    /** 줄을 특정하지 못한 서버 실패 */
    formError: serverErrorOf(formErrors, 'form'),
    /** [초대하기]를 한 번이라도 눌렀는지(`formState.isSubmitted`) */
    attempted: isSubmitted,
    submitting: mutation.isPending,
    submit,
  };
}
