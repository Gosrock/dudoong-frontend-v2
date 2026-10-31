'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { followHostMutation, unfollowHostMutation } from '@/api/host/mutations';
import { hostViewerQuery } from '@/api/host/queries';
import type { HostViewer } from '@/api/host/schema';

/**
 * ♡ 상태(UI 무관).
 * - `disabled` — 세션·viewer 확정 전(또는 확인 실패). 이미 팔로우한 사람에게 빈 ♡가 눌리는 순간을 만들지 않는다
 * - `login` — 익명 확정. 요청을 보내지 않는 로그인 링크 자리다(`LoginRequiredLink`, patterns §4-2)
 * - `ready` — viewer 값이 있다. `toggle()`로 PH-13
 */
export type FollowState =
  | { status: 'disabled'; isFollowing: false }
  | { status: 'login'; isFollowing: false }
  | { status: 'ready'; isFollowing: boolean; isPending: boolean; toggle: () => void };

export type ViewerStatus = 'pending' | 'anonymous' | 'ready' | 'error';

/**
 * 팔로우 토글. 누르는 즉시 viewer 키의 `isFollowing`을 바꾸고(낙관), PUT/DELETE를 보낸다.
 * 연타 대비: 같은 `scope`의 변경은 TanStack이 순서대로 하나씩 보낸다 — 마지막으로 누른 상태의 요청이 마지막에 도착하므로
 * 서버 상태 = 화면 상태다. PH-13은 멱등이라 같은 요청이 다시 가도 200이다(plan P5c).
 * 응답은 마지막 클릭의 것만 캐시에 반영하고, 마지막 요청이 실패하면 viewer를 다시 읽어 실제 상태로 돌린다(토스트는 전역).
 * 공개 키는 건드리지 않는다(`followerCount`를 그리지 않는다 — tech-decisions §4).
 */
export function useHostFollow(
  hostId: string,
  viewerStatus: ViewerStatus,
  viewer: HostViewer | undefined,
): FollowState {
  const queryClient = useQueryClient();
  const latest = useRef(0);
  const viewerKey = hostViewerQuery(hostId).queryKey;

  const { mutate, isPending } = useMutation({
    mutationKey: ['hosts', hostId, 'follow'],
    scope: { id: `host-follow:${hostId}` },
    mutationFn: (on: boolean, context) =>
      (on ? followHostMutation(hostId) : unfollowHostMutation(hostId)).mutationFn!(
        undefined,
        context,
      ),
  });

  const isFollowing = viewer?.isFollowing ?? false;
  const toggle = useCallback(() => {
    const current = queryClient.getQueryData(viewerKey);
    if (!current) return;
    const next = !current.isFollowing;
    const id = ++latest.current;
    void queryClient.cancelQueries(
      { queryKey: viewerKey, exact: true },
      { revert: false, silent: true },
    );
    queryClient.setQueryData(viewerKey, { ...current, isFollowing: next });
    mutate(next, {
      onSuccess: (res) => {
        if (id !== latest.current) return;
        queryClient.setQueryData(viewerKey, (old) =>
          old ? { ...old, isFollowing: res.isFollowing, followerCount: res.followerCount } : old,
        );
      },
      onError: () => {
        if (id !== latest.current) return;
        void queryClient.invalidateQueries({ queryKey: viewerKey, exact: true });
      },
    });
    // viewerKey는 hostId에서만 나온다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, mutate, hostId]);

  if (viewerStatus === 'anonymous') return { status: 'login', isFollowing: false };
  if (viewerStatus !== 'ready' || !viewer) return { status: 'disabled', isFollowing: false };
  return { status: 'ready', isFollowing, isPending, toggle };
}
