'use client';

import { useMutation, useQueryClient, useSuspenseQueries } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import { handleCodes } from '@/api/handle-codes';
import {
  removeHostMemberMutation,
  transferMasterMutation,
  updateHostMemberRoleMutation,
} from '@/api/host/mutations';
import { hostMembersQuery, hostViewerQuery } from '@/api/host/queries';
import type { AssignableHostRole } from '@/api/host/schema';
import { meQuery } from '@/api/me/queries';
import { hostingAccessOfRole } from '@/features/hosting/access/model/hosting-access';
import { can, superAdminOrRole } from '@/features/shared/permission/model/can';

import { applyMembers, invalidateHostSummary, invalidateMyRoleQueries } from './host-cache';
import {
  HOST_ROLE_LABEL,
  MEMBER_ACTION_ERROR_MESSAGE,
  memberActionsOf,
  PERMISSION_GUIDE,
} from './member-rules';

/**
 * 멤버 관리(`/hosting/hosts/[hostId]/members`, GH-6 · PH-10 · DH-11 · PH-12, plan P10b). 목록·행별 할 수 있는 일·변경 동작만 돌려주고
 * UI 동작(메뉴·확인 팝업)은 없다(plan §0). 초대는 `useInviteMembers`.
 * `<AsyncBoundary rejected={HostingAccessRejected}>` 안에서 쓴다 — GH-3 viewer(`myRole`)·GH-6·GM-1을 함께 Suspense로 읽는다.
 *
 * - 접근: 비멤버는 GH-6이 403(`HOST_400_2`) → 경계가 공용 403. GH-6(G+)이 성공했는데 viewer `myRole`이 null이면 멤버가 아닌
 *   SUPER_ADMIN이다 — `myRole: 'SUPER_ADMIN'`으로 판정한다(`superAdminOrRole`, 사용자 결정 2026-10-31. 매니저 범위 + 역할 변경)
 * - 버튼: `myRole`(GH-3 viewer)로 `memberActionsOf` — 마스터·매니저·일반 3시점(patterns §22, api-contract §2). 일반 멤버는 목록만
 * - 변경 응답(변경 뒤 멤버 전체 목록)을 GH-6 키에 그대로 넣는다. 삭제는 멤버 수가 바뀌어 GH-3 두 키도 무효화한다
 * - 양도(PH-12) 뒤에는 `myRole`을 주는 쿼리(GH-1 · GH-3 viewer · GE-1 · GE-3 · GM-1)를 무효화한다 — viewer가 다시 오면 버튼이 매니저
 *   기준으로 바뀐다. 다른 멤버의 역할 변경(PH-10)은 내 `myRole`을 바꾸지 않아 무효화하지 않는다
 * - 에러: `HOST_404_2`(이미 없는 멤버) → GH-6을 다시 읽고 `actionError`. 그 밖(403·`HOST_400_5`·`10`·`11`·`12` — 버튼을 미리 숨긴다)은 전역 토스트
 * - 한 번에 한 변경만(`pendingUserId`) — 요청 중에는 다른 행 동작도 보내지 않는다
 */
export function useHostMembers(hostId: string) {
  const queryClient = useQueryClient();
  const [{ data: viewer }, { data: members }, { data: me }] = useSuspenseQueries({
    queries: [hostViewerQuery(hostId), hostMembersQuery(hostId), meQuery()],
  });
  // GH-6(G+)이 함께 성공했다 — null이면 SUPER_ADMIN
  const myRole = superAdminOrRole(viewer.myRole);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const inflight = useRef(false);

  const codes = useMemo(
    () =>
      handleCodes({
        HOST_404_2: () => {
          setActionError(MEMBER_ACTION_ERROR_MESSAGE.HOST_404_2);
          void queryClient.invalidateQueries({
            queryKey: hostMembersQuery(hostId).queryKey,
            exact: true,
          });
        },
      }),
    [hostId, queryClient],
  );

  const roleMutation = useMutation({
    ...updateHostMemberRoleMutation(hostId),
    ...codes,
    onSuccess: (list) => applyMembers(queryClient, hostId, list),
  });
  const removeMutation = useMutation({
    ...removeHostMemberMutation(hostId),
    ...codes,
    onSuccess: async (list) => {
      applyMembers(queryClient, hostId, list);
      await invalidateHostSummary(queryClient, hostId);
    },
  });
  const transferMutation = useMutation({
    ...transferMasterMutation(hostId),
    ...codes,
    onSuccess: async (list) => {
      applyMembers(queryClient, hostId, list);
      await invalidateMyRoleQueries(queryClient, hostId);
    },
  });

  /** 한 번에 하나만. 성공하면 `true`. 표에 없는 실패는 전역 토스트 */
  const run = useCallback(async (userId: number, call: () => Promise<unknown>) => {
    if (inflight.current) return false;
    inflight.current = true;
    setPendingUserId(userId);
    setActionError(null);
    try {
      await call();
      return true;
    } catch {
      return false;
    } finally {
      inflight.current = false;
      setPendingUserId(null);
    }
  }, []);

  const rows = useMemo(
    () =>
      members.map((m) => ({
        ...m,
        roleLabel: HOST_ROLE_LABEL[m.role],
        /** 나(GM-1 `userId`) — "나" 표시용 */
        isMe: me?.userId === m.userId,
        actions: memberActionsOf(myRole, m),
      })),
    [me?.userId, members, myRole],
  );

  const findActions = (userId: number) => rows.find((r) => r.userId === userId)?.actions;

  return {
    /** 비멤버면 `forbidden` — 화면이 공용 403 안내를 그린다 */
    access: hostingAccessOfRole(myRole),
    myRole,
    /** 호스트 이름(제목용) */
    hostName: viewer.name,
    /** 마스터 → 매니저 → 일반, 같은 역할은 먼저 들어온 순(서버 순서 그대로). 이메일은 없다 */
    members: rows,
    /** [멤버 초대] 입구 — 매니저 이상 */
    canInvite: can(myRole, 'manageMembers'),
    /** 역할 변경(PH-10, 마스터만). 행이 허용한 역할만 보낸다 */
    changeRole: (userId: number, role: AssignableHostRole) =>
      findActions(userId)?.changeRoleTo === role
        ? run(userId, () => roleMutation.mutateAsync({ userId, role }))
        : Promise.resolve(false),
    /** 삭제(DH-11) */
    remove: (userId: number) =>
      findActions(userId)?.remove
        ? run(userId, () => removeMutation.mutateAsync(userId))
        : Promise.resolve(false),
    /** 마스터 양도(PH-12) — 확인은 V */
    transferMaster: (userId: number) =>
      findActions(userId)?.transfer
        ? run(userId, () => transferMutation.mutateAsync({ userId }))
        : Promise.resolve(false),
    /** 요청 중인 멤버 */
    pendingUserId,
    /** 화면이 처리한 실패(`HOST_404_2`). 다음 동작에서 지운다 */
    actionError,
    /** 권한 가이드 표(api-contract §2, "호스트 삭제" 행 없음) */
    permissionGuide: PERMISSION_GUIDE,
  };
}
