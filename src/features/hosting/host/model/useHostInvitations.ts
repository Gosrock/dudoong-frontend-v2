'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import { isApiError } from '@/api/errors';
import { handleError, handlersFrom } from '@/api/handle-error';
import type { AssignableHostRole } from '@/api/host/schema';
import {
  cancelHostInvitationMutation,
  createHostInvitationMutation,
} from '@/api/host-invitation/mutations';
import { hostInvitationsQuery } from '@/api/host-invitation/queries';
import { type ActorRole, can } from '@/features/shared/permission/model/can';
import { tryCatch } from '@/utils/try-catch';

import {
  canCreateInvitation,
  CREATE_INVITATION_ERROR_MESSAGE,
  INVITATION_GONE_MESSAGE,
  invitationRowsOf,
  inviteUrlOf,
} from './invitation-rules';

/** 초대 취소 결과 — 성공 `true` · 이미 없는 초대(`HOST_404_3`, 목록을 다시 읽음) `'missing'` · 그 밖 실패 `false` */
export type CancelInvitationResult = boolean | 'missing';

/**
 * 대기 중인 초대(H-17) · 취소(H-18) — 멤버 관리 화면의 "초대 대기" 목록. 매니저 이상만 부른다(`can(manageMembers)`).
 * 새 API(Api 2.5.7)라 운영 2.5.3은 404, 스테이징 DDL 전은 500이다 — 404는 목록을 숨기고(`hidden`), 그 밖 실패는 그 자리 `InlineError`.
 * 멤버 목록 화면은 죽지 않는다(useQuery — Suspense · 경계를 쓰지 않는다).
 */
export function useHostInvitations(hostId: string, myRole: ActorRole | null) {
  const queryClient = useQueryClient();
  const enabled = can(myRole, 'manageMembers');
  const query = useQuery({ ...hostInvitationsQuery(hostId), enabled });
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const inflight = useRef(false);
  const cancelMutation = useMutation({
    ...cancelHostInvitationMutation(hostId),
    onSuccess: (list) => queryClient.setQueryData(hostInvitationsQuery(hostId).queryKey, list),
  });

  const rows = useMemo(() => invitationRowsOf(query.data ?? [], myRole), [query.data, myRole]);

  const cancel = useCallback(
    async (invitationId: number): Promise<CancelInvitationResult> => {
      if (inflight.current) return false;
      if (!rows.find((r) => r.invitationId === invitationId)?.cancelable) return false;
      inflight.current = true;
      setPendingId(invitationId);
      setActionError(null);
      const [, error] = await tryCatch(cancelMutation.mutateAsync(invitationId));
      inflight.current = false;
      setPendingId(null);
      if (!error) return true;
      let result: CancelInvitationResult = false;
      handleError(error, {
        HOST_404_3: () => {
          result = 'missing';
          setActionError(INVITATION_GONE_MESSAGE);
          void query.refetch();
        },
      });
      return result;
    },
    [cancelMutation, query, rows],
  );

  const status: 'hidden' | 'pending' | 'error' | 'success' = !enabled
    ? 'hidden'
    : query.status === 'error'
      ? isApiError(query.error) &&
        query.error.status === 404 &&
        !query.error.code?.startsWith('HOST')
        ? 'hidden'
        : 'error'
      : query.status;

  return {
    /** `hidden` — 권한 없음 또는 서버에 API가 없음(운영 2.5.3 404) */
    status,
    retry: () => void query.refetch(),
    rows,
    cancel,
    pendingId,
    /** 화면이 처리한 실패(`HOST_404_3`). 다음 취소에서 지운다 */
    actionError,
  };
}

/** 만든 링크 — 공유 주소 · 만료 · 메일을 이번에 보냈는지 */
export type CreatedInviteLink = { url: string; expiresAt: string; mailSent: boolean | null };

/**
 * 초대 링크 만들기(H-16). PH-7이 `HOST_400_13`(미가입)이면 초대 팝업이 같은 이메일 · 역할로 부른다.
 * 성공하면 대기 초대 목록(H-17)을 무효화한다. 실패: `HOST_400_15`(이미 멤버) · `HOST_400_21`(발급 한도)은 `error` 문구, 그 밖은 공용 토스트.
 * 링크 출처는 지금 창의 출처(`window.location.origin`)다 — 서버는 경로만 준다.
 */
export function useCreateInviteLink(hostId: string, myRole: ActorRole | null | undefined) {
  const queryClient = useQueryClient();
  const [link, setLink] = useState<CreatedInviteLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    ...createHostInvitationMutation(hostId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: hostInvitationsQuery(hostId).queryKey,
        exact: true,
      }),
  });

  const create = useCallback(
    async (email: string, role: AssignableHostRole) => {
      if (mutation.isPending || !canCreateInvitation(myRole, role)) return false;
      setError(null);
      const [created, e] = await tryCatch(mutation.mutateAsync({ email: email.trim(), role }));
      if (e) {
        handleError(
          e,
          handlersFrom(CREATE_INVITATION_ERROR_MESSAGE, (message) => setError(message)),
        );
        return false;
      }
      setLink({
        url: inviteUrlOf(created, window.location.origin),
        expiresAt: created.expiresAt,
        mailSent: created.mailSent ?? null,
      });
      return true;
    },
    [mutation, myRole],
  );

  return {
    create,
    creating: mutation.isPending,
    link,
    error,
    reset: () => {
      setLink(null);
      setError(null);
    },
  };
}
