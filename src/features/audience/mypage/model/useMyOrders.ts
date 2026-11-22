'use client';

import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { myOrdersQuery } from '@/api/order/queries';
import { flattenPages, infiniteListControls } from '@/api/shared/page';
import { orderHref } from '@/features/shared/routes';

import { orderCardChip } from './order-status';

/**
 * 주문내역(`/orders`, G11/O-2). 보호 화면이라 `<AsyncBoundary>` 안에서 첫 페이지를 `useSuspenseInfiniteQuery`로 읽는다 — 첫 로딩
 * 실패는 경계가 맡고, 다음 페이지 실패는 기존 행을 두고 하단 재시도(`nextPageError`·`retry`, patterns §12).
 * 정렬은 서버 최신순 하나, 상태 필터는 없다(Q36 — 고정 라벨 `sortLabel`).
 * 상태 칩은 승인대기 · 승인완료 · 승인거절만(`orderCardChip` — 취소 · 환불 주문은 칩 없음, 보조 칩 없음, #381). 삭제된 공연(`event: null`)도 행은 그린다(`eventRemoved`).
 */
export function useMyOrders() {
  const list = useSuspenseInfiniteQuery(myOrdersQuery());
  const orders = useMemo(
    () =>
      flattenPages(list.data, (o) => o.orderUuid).map((o) => ({
        ...o,
        chip: orderCardChip(o.status),
        eventRemoved: o.event === null,
        href: orderHref(o.orderUuid),
      })),
    [list.data],
  );
  return {
    orders,
    empty: orders.length === 0,
    sortLabel: '최신순',
    ...infiniteListControls(list),
  };
}
