import type { QueryClient } from '@tanstack/react-query';

import { eventDashboardQuery } from '@/api/dashboard/queries';
import { hostIssuedTicketsKey } from '@/api/issued-ticket/queries';
import { hostOrderQuery, hostOrdersKey, hostRefundsKey } from '@/api/order/queries';
import type { HostOrderDetail } from '@/api/order/schema';
import { eventTicketItemsQuery, ticketItemsManageQuery } from '@/api/ticket-item/queries';

/**
 * 주문 처리(PR-3·PR-4·PR-5·PF-2) 뒤 반영(plan P13a "승인·거절 뒤 상태 탭 counts가 갱신됨").
 * - 응답(처리 뒤 주문 상세)은 GR-2 키에 넣는다
 * - 주문 목록(GR-1 — 상태 탭 `counts`)·환불 목록(GF-1)·발급 티켓(GI-1·GI-2)·대시보드(GD-1)를 무효화한다
 * - 승인·승인 후 취소는 재고가 바뀐다 — 티켓 관리 목록(T-1 잠금·판매)과 관객 GP-5(잔여)도 정확히 무효화한다
 */
export async function applyChangedOrder(
  queryClient: QueryClient,
  eventId: string,
  detail: HostOrderDetail,
  { stockChanged }: { stockChanged: boolean },
) {
  queryClient.setQueryData(hostOrderQuery(eventId, detail.order.orderUuid).queryKey, detail);
  await invalidateGuestLists(queryClient, eventId, { stockChanged });
}

/** 목록·대시보드 다시 읽기(상세 키는 건드리지 않는다 — 열린 상세는 응답이나 `refetchOrder`로) */
export async function invalidateGuestLists(
  queryClient: QueryClient,
  eventId: string,
  { stockChanged = false }: { stockChanged?: boolean } = {},
) {
  const keys = [
    [...hostOrdersKey(eventId), 'list'],
    hostRefundsKey(eventId),
    hostIssuedTicketsKey(eventId),
  ];
  const exact = [
    eventDashboardQuery(eventId).queryKey,
    ...(stockChanged
      ? [ticketItemsManageQuery(eventId).queryKey, eventTicketItemsQuery(eventId).queryKey]
      : []),
  ];
  await Promise.all([
    ...keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    ...exact.map((queryKey) => queryClient.invalidateQueries({ queryKey, exact: true })),
  ]);
}

/** 상세 하나를 다시 읽는다(이미 처리됨·시작 후 등 — patterns §24 "GR-2 다시 읽기") + 목록 */
export async function refetchOrder(queryClient: QueryClient, eventId: string, orderUuid: string) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: hostOrderQuery(eventId, orderUuid).queryKey,
      exact: true,
    }),
    invalidateGuestLists(queryClient, eventId),
  ]);
}
