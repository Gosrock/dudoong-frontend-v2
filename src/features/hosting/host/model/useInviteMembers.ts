'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import { type ApiError } from '@/api/errors';
import { handleError } from '@/api/handle-error';
import { addHostMembersMutation } from '@/api/host/mutations';
import type { AssignableHostRole } from '@/api/host/schema';
import type { ActorRole } from '@/features/shared/permission/model/can';

import { applyMembers, invalidateHostSummary } from './host-cache';
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

/**
 * 멤버 초대(PH-7, plan P10b). 값·줄별 오류·제출만 돌려준다(초대 모달은 V). V는 한 줄만 그리지만(와이어 `503:32779` — 한 명씩)
 * L은 PH-7이 받는 1~20줄과 줄별 실패 매핑을 그대로 둔다.
 *
 * - 역할: `roleOptions`는 마스터 = 매니저·일반, **매니저 = "일반" 고정**(`setRole`이 다른 값을 무시한다). 기본값 "일반"
 * - 제출: 칸 오류(빈칸·이메일 모양·같은 이메일 두 번)가 있으면 요청하지 않는다. 요청 중에는 다시 보내지 않는다
 * - 성공: 응답(변경 뒤 멤버 전체 목록)을 GH-6 키에 넣고 멤버 수가 바뀐 GH-3 두 키를 무효화한 뒤, 폼을 한 줄로 비운다. `submit()`이 `true`
 * - 실패(patterns §24 P10b): `HOST_400_13`·`14`·`15`·`18` → `reason`의 이메일과 같은 줄에 사유(`rowErrors`). 맞는 줄이 없으면 `formError`.
 *   그 줄을 고치면 그 줄의 서버 오류를 지운다. 그 밖(400 `BAD_REQUEST`·403 등)은 공용 토스트(handleError)
 */
export function useInviteMembers(hostId: string, myRole: ActorRole | null | undefined) {
  const queryClient = useQueryClient();
  const roleOptions = useMemo(() => inviteRoleOptions(myRole), [myRole]);
  const [rows, setRows] = useState<InviteRow[]>(() => [emptyInviteRow()]);
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<(string | null)[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const inflight = useRef(false);
  /** 실패를 줄에 맞출 때 쓰는, 방금 보낸 줄 */
  const sentRows = useRef<InviteRow[]>([]);

  const localErrors = useMemo(() => inviteRowErrors(rows), [rows]);

  // 목록 반영·무효화는 화면이 사라져도 해야 하므로 옵션의 onSuccess에 둔다
  const mutation = useMutation({
    ...addHostMembersMutation(hostId),
    onSuccess: async (list) => {
      applyMembers(queryClient, hostId, list);
      await invalidateHostSummary(queryClient, hostId);
    },
  });

  /** 한 줄을 고친다 — 그 줄의 서버 오류와 폼 오류를 지운다 */
  const editRow = useCallback((index: number, patch: Partial<InviteRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    setServerErrors((prev) => prev.map((e, i) => (i === index ? null : e)));
    setFormError(null);
  }, []);

  const setEmail = useCallback(
    (index: number, email: string) => editRow(index, { email }),
    [editRow],
  );
  const setRole = useCallback(
    (index: number, role: AssignableHostRole) => {
      if (roleOptions.includes(role)) editRow(index, { role });
    },
    [editRow, roleOptions],
  );
  // 줄을 더하거나 빼면 지난 실패의 줄 매핑이 어긋나므로 서버 오류를 모두 지운다
  const addRow = useCallback(() => {
    setRows((prev) => (canAddInviteRow(prev) ? [...prev, emptyInviteRow()] : prev));
    setServerErrors([]);
    setFormError(null);
  }, []);
  const removeRow = useCallback((index: number) => {
    setRows((prev) => (canRemoveInviteRow(prev) ? prev.filter((_, i) => i !== index) : prev));
    setServerErrors([]);
    setFormError(null);
  }, []);

  /** 초대했으면 `true`. 초대할 수 없는 역할·칸 오류·요청 중이면 요청하지 않고 `false` */
  const submit = useCallback(async () => {
    setAttempted(true);
    if (roleOptions.length === 0 || inflight.current) return false;
    if (localErrors.some((e) => e !== null)) return false;
    inflight.current = true;
    setServerErrors([]);
    setFormError(null);
    sentRows.current = rows;
    try {
      await mutation.mutateAsync(toAddMembersBody(rows));
      inflight.current = false;
      setRows([emptyInviteRow()]);
      setServerErrors([]);
      setAttempted(false);
      return true;
    } catch (error) {
      inflight.current = false;
      const mapToRows = (code: InviteErrorCode) => (e: ApiError) => {
        const mapped = inviteServerErrors(code, e.reason, sentRows.current);
        setServerErrors(mapped.rows);
        setFormError(mapped.form);
      };
      // 표에 없는 실패는 공용 토스트
      handleError(
        error,
        Object.fromEntries(
          (Object.keys(INVITE_ERROR_MESSAGE) as InviteErrorCode[]).map((c) => [c, mapToRows(c)]),
        ),
      );
      return false;
    }
  }, [localErrors, mutation, roleOptions.length, rows]);

  return {
    rows,
    setEmail,
    setRole,
    addRow,
    removeRow,
    canAddRow: canAddInviteRow(rows),
    canRemoveRow: canRemoveInviteRow(rows),
    /** 고를 수 있는 역할(매니저는 `['GUEST']`). 비면 초대할 수 없다 */
    roleOptions,
    /** 줄마다 칸 오류(빈칸·이메일 모양·같은 이메일). 언제 보일지는 `attempted`를 기준으로 V가 정한다 */
    errors: localErrors,
    /** 줄마다 서버 실패 사유(`HOST_400_13`·`14`·`15`·`18`). 그 줄을 고치면 지운다 */
    serverErrors: rows.map((_, i) => serverErrors[i] ?? null),
    /** 줄을 특정하지 못한 서버 실패 */
    formError,
    attempted,
    submitting: mutation.isPending,
    submit,
  };
}
