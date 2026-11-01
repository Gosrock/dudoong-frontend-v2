import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { eventManageKey } from '../event/queries';
import { api } from '../http';
import { pageInfinite, type PageParams } from '../shared/page';
import {
  CheckoutSchema,
  HostOrderDetailSchema,
  HostOrderListSchema,
  type HostOrderStatusFilter,
  MyOrderDetailSchema,
  MyOrderPageSchema,
  type MyOrderStatusFilter,
  type OrderSearchType,
  RefundPageSchema,
  type RefundStatusFilter,
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

/** 내 주문 무한 목록의 접두 키 — 필터와 상관없이 목록 전부를 무효화할 때 쓴다 */
export const MY_ORDERS_INFINITE_KEY = ['me', 'orders', 'infinite'] as const;

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
    queryKey: [...MY_ORDERS_INFINITE_KEY, p],
    queryFn: ({ pageParam, signal }) =>
      api.get('me/orders', MyOrderPageSchema, { searchParams: { ...p, page: pageParam }, signal }),
  });
};

// ─── 호스트 주문 관리(P13a) ───────────────────────────────────

/**
 * 호스트 주문 키 접두. 모두 GE-3 아래(`['events', id, 'manage', …]`)라 마스터 양도 뒤 술어 무효화(P10b)에 함께 걸린다 —
 * 역할이 바뀌면 가림(#822)·환불 계좌 노출도 바뀐다. 목록은 `…, 'orders', 'list', params]`, 상세는 `…, 'orders', 'detail', uuid]`, 환불 목록은 `…, 'refunds', 'list', params]`
 * (patterns §4-1 list/detail — 무효화는 접두 키로 하므로 2026-11-02 `'list'`를 더해도 cache 파일은 그대로다).
 */
export const hostOrdersKey = (eventId: string | number) =>
  [...eventManageKey(eventId), 'orders'] as const;
export const hostRefundsKey = (eventId: string | number) =>
  [...eventManageKey(eventId), 'refunds'] as const;

export type HostOrdersParams = {
  status?: HostOrderStatusFilter;
  searchType?: OrderSearchType;
  keyword?: string;
  page?: number;
  size?: number;
};

/**
 * GR-1·GR-6 쿼리 파라미터 정규형. 서버 기본값(ALL·NAME·0)은 보내지 않고, 검색어는 trim 후 비면 뺀다(검색 기준도 함께 뺀다).
 * queryKey에도 이 값을 쓴다
 */
export function normalizeHostOrdersParams(params: HostOrdersParams = {}) {
  const keyword = params.keyword?.trim();
  return {
    ...(params.status && params.status !== 'ALL' && { status: params.status }),
    ...(keyword && {
      keyword,
      ...(params.searchType && params.searchType !== 'NAME' && { searchType: params.searchType }),
    }),
    ...(params.page && { page: params.page }),
    ...(params.size !== undefined && { size: params.size }),
  };
}

/** GR-1 주문 목록 + 상태별 건수(운영 표 — 페이지 번호, patterns §12). 일반 멤버 이상 */
export const hostOrdersQuery = (eventId: string | number, params: HostOrdersParams = {}) => {
  const p = normalizeHostOrdersParams(params);
  return queryOptions({
    queryKey: [...hostOrdersKey(eventId), 'list', p],
    queryFn: ({ signal }) =>
      api.get(`events/${encodeURIComponent(eventId)}/orders`, HostOrderListSchema, {
        searchParams: p,
        signal,
      }),
  });
};

/** GR-2 주문 상세. 다른 공연 주문은 404 `Order_404_1` — 공용 404가 아니라 모달을 닫고 목록을 다시 읽는다(patterns §24) */
export const hostOrderQuery = (eventId: string | number, orderUuid: string) =>
  queryOptions({
    queryKey: [...hostOrdersKey(eventId), 'detail', orderUuid],
    queryFn: ({ signal }) =>
      api.get(
        `events/${encodeURIComponent(eventId)}/orders/${encodeURIComponent(orderUuid)}`,
        HostOrderDetailSchema,
        { signal },
      ),
  });

export type RefundsParams = { status?: RefundStatusFilter; page?: number; size?: number };

/** GF-1 환불 목록(환불 상태가 NONE이 아닌 주문, 최신 순). 계좌는 매니저 이상에게만 값이 있다 */
export const refundsQuery = (eventId: string | number, params: RefundsParams = {}) => {
  const p = {
    ...(params.status && params.status !== 'ALL' && { status: params.status }),
    ...(params.page && { page: params.page }),
    ...(params.size !== undefined && { size: params.size }),
  };
  return queryOptions({
    queryKey: [...hostRefundsKey(eventId), 'list', p],
    queryFn: ({ signal }) =>
      api.get(`events/${encodeURIComponent(eventId)}/refunds`, RefundPageSchema, {
        searchParams: p,
        signal,
      }),
  });
};
