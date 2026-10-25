import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { api } from '../http';
import { pageInfinite, type PageParams } from '../shared/page';
import {
  CheckoutSchema,
  MyOrderDetailSchema,
  MyOrderPageSchema,
  type MyOrderStatusFilter,
} from './schema';

/**
 * G11/O-0 결제 화면(로그인) — 티켓(GP-5와 같은 모양) + 입금 계좌. 체크아웃(보호 화면)이 브라우저에서 읽는다.
 * 판매 중이 아니거나 다른 공연 티켓이면 404 `Ticket_Item_404_1`(patterns §16 — 티켓 선택으로 돌려보낸다).
 */
export const checkoutQuery = (eventId: string | number, ticketItemId: string | number) =>
  queryOptions({
    queryKey: ['events', String(eventId), 'ticket-items', String(ticketItemId), 'checkout'],
    queryFn: ({ signal }) =>
      api.get(
        `events/${encodeURIComponent(eventId)}/ticket-items/${encodeURIComponent(ticketItemId)}/checkout`,
        CheckoutSchema,
        { signal },
      ),
  });

/**
 * G11/O-3 내 주문 상세(본인 주문만, 남의 주문은 404). 주문 완료 화면(`/orders/[orderUuid]?created=1`)은
 * 생성 응답을 이 키에 `setQueryData`로 넣고 이동하고, 새로고침·하드 리로드에서는 이 조회로 다시 그린다(tech-decisions §3).
 */
export const myOrderQuery = (orderUuid: string) =>
  queryOptions({
    queryKey: ['me', 'orders', orderUuid],
    queryFn: ({ signal }) =>
      api.get(`me/orders/${encodeURIComponent(orderUuid)}`, MyOrderDetailSchema, { signal }),
  });

export type MyOrdersParams = PageParams & { status?: MyOrderStatusFilter };

/**
 * G11/O-2 내 주문 목록(로그인, 무한 목록 — patterns §12). 최신 순 하나. `status`는 서버가 받지만 화면 필터는 아직 없다(Q36) —
 * 기본(ALL)이면 보내지 않는다. 키는 `['me', 'orders', 'infinite', params]`라 `['me', 'orders']` 하나로 목록·상세를 같이 무효화한다.
 */
export const myOrdersQuery = (params: MyOrdersParams = {}) => {
  const p = {
    ...(params.status && params.status !== 'ALL' && { status: params.status }),
    ...(params.size !== undefined && { size: params.size }),
  };
  return infiniteQueryOptions({
    ...pageInfinite,
    queryKey: ['me', 'orders', 'infinite', p],
    queryFn: ({ pageParam, signal }) =>
      api.get('me/orders', MyOrderPageSchema, { searchParams: { ...p, page: pageParam }, signal }),
  });
};
