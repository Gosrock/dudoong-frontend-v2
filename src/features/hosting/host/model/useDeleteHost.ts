'use client';

import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { MY_EVENTS_KEY } from '@/api/event/queries';
import { handleError } from '@/api/handle-error';
import { deleteHostMutation } from '@/api/host/mutations';
import { hostViewerQuery, MY_HOSTS_KEY } from '@/api/host/queries';
import { FOLLOWING_HOSTS_KEY, meQuery } from '@/api/me/queries';
import { HOSTING_HOME_HOSTS_HREF } from '@/features/hosting/shared/routes';
import { can, superAdminOrRole } from '@/features/shared/permission/model/can';

import { DELETE_HOST_BLOCKED_MESSAGE, hostDeletionOf } from './host-delete-rules';

/** 삭제 결과 — 성공 `true` · 막힘(`HOST_400_22`, 최신 값을 다시 읽음) `'blocked'` · 그 밖 실패 `false` */
export type DeleteHostResult = boolean | 'blocked';

/**
 * 호스트 삭제(H-22 — Api 2.5.16, #348 B73 · Design Sync #293). 호스트 설정 화면 맨 아래 "호스트 삭제하기"의 L.
 * GH-3 viewer(`preparingEventCount` · `deletable` · `deleteBlockedReason` — 활성 마스터에게만 값)로 영역 상태를 정한다(`hostDeletionOf`).
 * 권한은 `can(role, 'deleteHost')`(마스터만). 설정 화면이 이미 Suspense로 읽은 viewer 키를 같이 읽는다.
 *
 * - `remove()`는 확인 창 계약(patterns §6): 성공 `true` — 내 호스트(GH-1) · 관심 호스트(GM-4) · 내 공연(GE-1 — 준비중 공연이 함께
 *   지워졌다) · GM-1(햄버거 호스트 줄)을 무효화한다. 그 호스트 키(`['hosts', id]` 접두)는 다시 읽지 않고 낡은 값으로만 둔다 — 지금 화면이
 *   다시 읽으면 404가 먼저 보인다
 * - `leave()` 공연 준비 홈 호스트 탭으로 `replace`(지운 호스트로 돌아가지 않게). **확인 창이 닫힌 뒤에** 부른다 — 창은 닫힐 때 자기
 *   history 항목을 소비하므로(`openConfirm`이 `true`로 resolve된 뒤) 그 전에 옮기면 `history.back()`이 이동을 되돌린다
 * - `HOST_400_22`(확인 창 사이에 공연이 등록됨 등): viewer를 다시 읽고 `'blocked'`(창은 닫고 영역에 사유). 그 밖은 공용 토스트 + `false`
 */
export function useDeleteHost(hostId: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: host, refetch } = useSuspenseQuery(hostViewerQuery(hostId));
  const [raceBlocked, setRaceBlocked] = useState(false);
  const allowed = can(superAdminOrRole(host.myRole), 'deleteHost');
  const deletion = hostDeletionOf(host, allowed, raceBlocked);

  const mutation = useMutation({
    ...deleteHostMutation(hostId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['hosts', hostId], refetchType: 'none' }),
        queryClient.invalidateQueries({ queryKey: MY_HOSTS_KEY }),
        queryClient.invalidateQueries({ queryKey: FOLLOWING_HOSTS_KEY }),
        queryClient.invalidateQueries({ queryKey: MY_EVENTS_KEY }),
        queryClient.invalidateQueries({ queryKey: meQuery().queryKey, exact: true }),
      ]);
    },
  });

  const remove = useCallback(async (): Promise<DeleteHostResult> => {
    if (deletion.kind !== 'ready' || mutation.isPending) return false;
    try {
      await mutation.mutateAsync();
      return true;
    } catch (e) {
      let result: DeleteHostResult = false;
      handleError(e, {
        HOST_400_22: () => {
          result = 'blocked';
          setRaceBlocked(true);
          void refetch();
        },
      });
      return result;
    }
  }, [deletion.kind, mutation, refetch]);

  return {
    /** `hidden` 마스터 아님 · 값 없음 / `blocked` 사유 / `ready` 준비중 공연 수 */
    deletion,
    remove,
    deleting: mutation.isPending,
    leave: () => router.replace(HOSTING_HOME_HOSTS_HREF),
    blockedMessage: DELETE_HOST_BLOCKED_MESSAGE,
  };
}
