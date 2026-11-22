'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import { isApiError } from '@/api/errors';
import { handleError } from '@/api/handle-error';
import { cancelHostInvitationMutation } from '@/api/host-invitation/mutations';
import { hostInvitationsQuery } from '@/api/host-invitation/queries';
import { type ActorRole, can } from '@/features/shared/permission/model/can';
import { tryCatch } from '@/utils/try-catch';

import { hasPendingInvitation, INVITATION_GONE_MESSAGE, invitationRowsOf } from './invitation-rules';

/** 초대 취소 결과 — 성공 `true` · 이미 없는 초대(`HOST_404_3`, 목록을 다시 읽음) `'missing'` · 그 밖 실패 `false` */
export type CancelInvitationResult = boolean | 'missing';

/**
 * 대기 중인 초대(H-17) · 취소(H-18) — 멤버 관리 화면의 "초대 대기" 목록. 매니저 이상만 부른다(`can(manageMembers)`).
 * 모든 초대(가입한 이메일 포함 — B71)가 여기 들어온다. 서버에 API가 없으면(라우트 404) 목록을 숨기고(`hidden`), 그 밖 실패는 그 자리 `InlineError`.
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

  const status = invitationsStatusOf(enabled, query.status, query.error);

  return {
    /** `hidden` — 권한 없음 또는 서버에 API가 없음(운영 2.5.3 404) */
    status,
    retry: () => void query.refetch(),
    rows,
    /** 이 이메일로 보낸 대기 초대가 있는지(다시 초대하면 옛 링크가 무효 — 초대 시트 안내 `1476:7459`) */
    hasPendingFor: (email: string) => hasPendingInvitation(query.data ?? [], email),
    cancel,
    pendingId,
    /** 화면이 처리한 실패(`HOST_404_3`). 다음 취소에서 지운다 */
    actionError,
  };
}

type InvitationsStatus = 'hidden' | 'pending' | 'error' | 'success';

/**
 * 서버에 H-17이 없다(운영 2.5.3 — 라우트가 없어 HOST 코드 없는 404). 없는 호스트 · 초대(`HOST_404_*`)는 그대로 실패다
 */
function isInvitationsApiMissing(error: unknown) {
  return isApiError(error) && error.status === 404 && !error.code?.startsWith('HOST');
}

/** 목록 자리 상태 — 권한이 없거나 API가 없으면 숨김, 그 밖 실패는 그 자리 오류 */
function invitationsStatusOf(
  enabled: boolean,
  queryStatus: 'pending' | 'error' | 'success',
  error: unknown,
): InvitationsStatus {
  if (!enabled) return 'hidden';
  if (queryStatus !== 'error') return queryStatus;
  return isInvitationsApiMissing(error) ? 'hidden' : 'error';
}
