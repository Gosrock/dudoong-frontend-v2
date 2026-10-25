'use client';

import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { myOrdersQuery } from '@/api/order/queries';
import { flattenPages } from '@/api/shared/page';

import { orderHref } from './lists';
import { orderStatusView } from './order-status';

/**
 * 주문내역(`/orders`, G11/O-2). 보호 화면이라 `<AsyncBoundary>` 안에서 첫 페이지를 `useSuspenseInfiniteQuery`로 읽는다 — 첫 로딩
 * 실패는 경계가 맡고, 다음 페이지 실패는 기존 행을 두고 하단 재시도(`nextPageError`·`retry`, patterns §12).
 * 정렬은 서버 최신순 하나, 상태 필터는 없다(Q36 — 고정 라벨 `sortLabel`).
 * 상태 라벨은 상세와 같은 매핑(`orderStatusView`). 삭제된 공연(`event: null`)도 행은 그린다(`eventRemoved`).
 */
export function useMyOrders() {
  const list = useSuspenseInfiniteQuery(myOrdersQuery());
  const orders = useMemo(
    () =>
      flattenPages(list.data, (o) => o.orderUuid).map((o) => ({
        ...o,
        statusView: orderStatusView(o.status, o.refundStatus),
        eventRemoved: o.event === null,
        href: orderHref(o.orderUuid),
      })),
    [list.data],
  );
  return {
    orders,
    empty: orders.length === 0,
    sortLabel: '최근주문순',
    hasNextPage: list.hasNextPage,
    isFetchingNextPage: list.isFetchingNextPage,
    nextPageError: list.isFetchNextPageError,
    loadMore: () => {
      if (list.hasNextPage && !list.isFetching) void list.fetchNextPage({ cancelRefetch: false });
    },
    retry: () => void (list.isFetchNextPageError ? list.fetchNextPage() : list.refetch()),
  };
}
