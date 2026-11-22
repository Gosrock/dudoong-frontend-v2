'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';

import { handleError, handlersFrom } from '@/api/handle-error';
import type { AssignableHostRole } from '@/api/host/schema';
import { createHostInvitationMutation } from '@/api/host-invitation/mutations';
import { hostInvitationsQuery } from '@/api/host-invitation/queries';
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
  inviteRoleOptions,
  type InviteRow,
  inviteRowErrors,
  toInvitationBody,
} from './member-rules';

type InviteValues = { rows: InviteRow[] };

const initialInviteValues = (): InviteValues => ({ rows: [emptyInviteRow()] });
/** 줄 서버 오류 자리(`root.row<i>`) — 줄 수가 바뀌면 모두 지운다 */
const rowErrorKey = (index: number) => `row${index}` as const;

/**
 * 멤버 초대(H-16, plan P10b · #348 B71). **모든 초대는 H-16** — 가입한 이메일도 상대가 수락해야 멤버가 되고, 그때까지 "초대 대기"(H-17)에
 * 있다(DEC-015 폐기 · DEC-042). PH-7 즉시 추가는 부르지 않는다. 값·줄별 오류·제출만 돌려준다(초대 시트는 V).
 *
 * - 폼: RHF(patterns §23 — 행 반복 · 행별 서버 에러). 줄은 `useFieldArray`, 검증은 `inviteRowErrors`를 resolver로(`rhf-form.ts`)
 * - 역할: `roleOptions`는 마스터 = 매니저·일반, **매니저 = "일반" 고정**(`setRole`이 다른 값을 무시한다). 기본값 "일반"
 * - 제출: 칸 오류(빈칸·이메일 모양·같은 이메일 두 번)가 있으면 요청하지 않는다. 요청 중에는 다시 보내지 않는다
 * - 여러 줄이면 **줄마다 차례로 H-16**(묶음 API 없음). 성공한 줄은 폼에서 빠지고, 실패한 줄은 남아 그 줄에 사유가 붙는다.
 *   `HOST_400_15`(이미 멤버) · `HOST_400_21`(발급 한도)은 그 줄 사유(`rowErrors`), 그 밖(400 · 403 · 5xx)은 공용 토스트 — 한도 · 그 밖
 *   실패면 남은 줄은 보내지 않는다(같은 실패가 반복된다)
 * - 하나라도 보냈으면 H-17(대기 초대)을 무효화한다. 모두 보냈으면 폼을 한 줄로 비우고 `submit()`이 `true`
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

  // 한 줄을 고치면 그 줄의 서버 오류를, 줄을 더하거나 빼면(지난 실패의 줄 매핑이 어긋난다) 서버 오류를 모두 지운다
  useFieldChange(form, (name) => {
    const [, index] = name.split('.');
    if (index === undefined) return form.clearErrors('root');
    form.clearErrors(`root.${rowErrorKey(Number(index))}`);
  });

  const mutation = useMutation(createHostInvitationMutation(hostId));

  /** 모두 초대했으면 `true`. 초대할 수 없는 역할·칸 오류·요청 중·실패면 `false` */
  const submit = useCallback(async () => {
    const invited = await form.handleSubmit(async (valid) => {
      if (roleOptions.length === 0 || inflight.current) return false;
      inflight.current = true;
      const failed: { row: InviteRow; message: string }[] = [];
      let sent = 0;
      try {
        for (const [i, row] of valid.rows.entries()) {
          try {
            await mutation.mutateAsync(toInvitationBody(row));
            sent += 1;
          } catch (error) {
            const hit: { message: string | null } = { message: null };
            handleError(
              error,
              handlersFrom(INVITE_ERROR_MESSAGE, (m) => {
                hit.message = m;
              }),
            );
            const { message } = hit;
            // 이미 멤버는 그 줄만의 문제 — 다음 줄은 계속. 한도 · 그 밖 실패는 남은 줄도 같으니 멈춘다
            // 표에 없는 실패(공용 토스트)도 줄은 남긴다 — 사유 문구만 없다
            failed.push({ row, message: message ?? '' });
            if (message !== INVITE_ERROR_MESSAGE.HOST_400_15) {
              failed.push(...valid.rows.slice(i + 1).map((r) => ({ row: r, message: '' })));
              break;
            }
          }
        }
      } finally {
        inflight.current = false;
        if (sent > 0) {
          await queryClient.invalidateQueries({
            queryKey: hostInvitationsQuery(hostId).queryKey,
            exact: true,
          });
        }
      }
      if (failed.length === 0) return true;
      // 실패한 줄만 남기고(성공한 줄은 뺀다) 그 줄에 사유
      form.reset({ rows: failed.map((f) => f.row) }, { keepIsSubmitted: true });
      failed.forEach((f, i) => {
        if (f.message) form.setError(`root.${rowErrorKey(i)}`, { message: f.message });
      });
      return false;
    })();
    if (!invited) return false;
    // `handleSubmit`이 끝난 뒤에 한 줄로 비운다 — 그래야 `isSubmitted`(칸 오류 표시)도 풀린다
    form.reset(initialInviteValues());
    return true;
  }, [form, hostId, mutation, queryClient, roleOptions.length]);

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
    /** 줄마다 서버 실패 사유(`HOST_400_15` · `HOST_400_21`). 그 줄을 고치면 지운다 */
    serverErrors: rows.map((_, i) => serverErrorOf(formErrors, rowErrorKey(i))),
    /** [초대하기]를 한 번이라도 눌렀는지(`formState.isSubmitted`) */
    attempted: isSubmitted,
    submitting: mutation.isPending,
    submit,
  };
}
