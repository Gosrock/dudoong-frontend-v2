import { queryOptions } from '@tanstack/react-query';

import { api } from '../http';
import { CheckoutSchema, MyOrderDetailSchema } from './schema';

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
