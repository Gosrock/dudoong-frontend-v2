'use client';

import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { unfollowHostMutation } from '@/api/host/mutations';
import { hostViewerQuery } from '@/api/host/queries';
import { FOLLOWING_HOSTS_KEY, followingHostsQuery } from '@/api/me/queries';
import type { FollowingHost, FollowingHostFilter } from '@/api/me/schema';
import { handleError, settle } from '@/api/settle';
import { flattenPages, type Page } from '@/api/shared/page';

import { eventHref, FOLLOWING_TABS, hostHref, representativeBadge } from './lists';

type FollowingPages = InfiniteData<Page<FollowingHost>, number>;

/** 모든 필터의 캐시에서 그 호스트를 뺀다 */
const withoutHost = (data: FollowingPages | undefined, hostId: number) =>
  data && {
    ...data,
    pages: data.pages.map((p) => ({ ...p, content: p.content.filter((h) => h.hostId !== hostId) })),
  };

/**
 * 관심 호스트(`/mypage/following`, GM-4 + 해제 PH-13 DELETE). 필터 탭(`status` 3값)은 훅 안 상태라 탭을 바꾸면 새 키의 첫 페이지부터
 * 읽는다(patterns §12). 탭이 경계 밖에 남도록 `useInfiniteQuery`로 읽고 `listStatus`·`retry`를 준다.
 *
 * `unfollow(hostId)` — DELETE 성공 응답 뒤 모든 필터의 목록 캐시에서 그 호스트를 뺀다(목록을 다시 읽지 않는다). 호스트 홈의 viewer 키
 * (`isFollowing`)도 맞춘다. 실패는 공용 토스트(handleError), 목록은 그대로. 알려진 한계: 페이지 방식이라 뺀 뒤 다음 페이지를 읽으면 한 줄이
 * 앞 페이지로 밀려 보이지 않을 수 있다(서버 offset).
 */
export function useFollowingHosts() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<FollowingHostFilter>('ALL');
  const list = useInfiniteQuery(followingHostsQuery({ status }));
  const [unfollowing, setUnfollowing] = useState<ReadonlySet<number>>(new Set());

  // 캐시 반영은 화면이 사라져도(연달아 해제해도) 해야 하므로 옵션의 onSuccess에 둔다
  const { mutateAsync } = useMutation({
    mutationFn: (hostId: number, context) =>
      unfollowHostMutation(hostId).mutationFn!(undefined, context),
    onSuccess: (res, hostId) => {
      queryClient.setQueriesData<FollowingPages>({ queryKey: [...FOLLOWING_HOSTS_KEY] }, (d) =>
        withoutHost(d, hostId),
      );
      queryClient.setQueryData(hostViewerQuery(String(hostId)).queryKey, (old) =>
        old ? { ...old, isFollowing: res.isFollowing, followerCount: res.followerCount } : old,
      );
    },
  });

  const unfollow = useCallback(
    (hostId: number) => {
      if (unfollowing.has(hostId)) return;
      setUnfollowing((s) => new Set(s).add(hostId));
      void (async () => {
        const r = await settle(mutateAsync(hostId));
        setUnfollowing((s) => {
          const next = new Set(s);
          next.delete(hostId);
          return next;
        });
        if (!r.ok) handleError(r.error);
      })();
    },
    [mutateAsync, unfollowing],
  );

  const hosts = useMemo(
    () =>
      flattenPages(list.data, (h) => h.hostId).map((h) => ({
        ...h,
        href: hostHref(h.hostId),
        badge: representativeBadge(h.representativeEvent),
        eventHref: h.representativeEvent ? eventHref(h.representativeEvent.eventId) : null,
      })),
    [list.data],
  );

  return {
    tabs: FOLLOWING_TABS,
    status,
    setStatus,
    hosts,
    /** 첫 페이지 상태(`pending` 동안 목록 자리 스켈레톤, `error`면 `retry`) */
    listStatus: list.status,
    empty: list.status === 'success' && hosts.length === 0,
    hasNextPage: list.hasNextPage,
    isFetchingNextPage: list.isFetchingNextPage,
    nextPageError: list.isFetchNextPageError,
    loadMore: () => {
      if (list.hasNextPage && !list.isFetching) void list.fetchNextPage({ cancelRefetch: false });
    },
    retry: () => void (list.isFetchNextPageError ? list.fetchNextPage() : list.refetch()),
    unfollow,
    isUnfollowing: (hostId: number) => unfollowing.has(hostId),
  };
}
