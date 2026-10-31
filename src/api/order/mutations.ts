import { mutationOptions } from '@tanstack/react-query';

import { api } from '../http';
import { type HostOrdersParams, normalizeHostOrdersParams } from './queries';
import {
  type CancelMyOrderRequest,
  type CreateOrderRequest,
  type HostCancelOrderRequest,
  HostOrderDetailSchema,
  MyOrderDetailSchema,
  type RefundAccountRequest,
  type RefuseOrderRequest,
} from './schema';

/**
 * P11/O-1 주문 생성(로그인). 응답은 G11/O-3과 같은 주문 상세다. 같은 사용자의 같은 요청이 10초 안에 다시 오면
 * 서버가 앞 주문을 돌려준다(`Idempotency-Key` 없음). 무료 선착순 확정이 실패하면 주문이 아니라 원래 에러가 온다.
 * 캐시 반영·이동은 화면(`useCheckout`)이 한다.
 */
export const createOrderMutation = () =>
  mutationOptions({
    mutationFn: (body: CreateOrderRequest) => api.post('me/orders', MyOrderDetailSchema, body),
  });

/**
 * P11/O-4 취소·환불 요청(로그인, 본인 주문). 응답은 처리 뒤 주문 상세(G11/O-3과 같다).
 * 유료(총액 > 0)는 `{ refundAccount }` 필수 — 승인 완료면 환불 요청(`REFUNDED` + `REQUESTED`), 승인 대기면 철회 + 환불 요청.
 * 무료는 본문 없이 — 바로 취소(`CANCELED` + `NONE`). 코드 처리는 화면(`useCancelOrder`)이 한다(patterns §24 P9).
 */
export const cancelMyOrderMutation = (orderUuid: string) =>
  mutationOptions({
    mutationFn: (body?: CancelMyOrderRequest) =>
      api.post(`me/orders/${encodeURIComponent(orderUuid)}/cancel`, MyOrderDetailSchema, body),
  });

/**
 * P11/O-5 환불 계좌 입력·수정(로그인, 본인 주문). 전체 교체(PUT). 대상 아님 `Order_400_27`, 환불 완료 뒤 `Order_400_28`.
 * 응답은 주문 상세(`refundAccount.maskedAccountNumber`가 새 값).
 */
export const putRefundAccountMutation = (orderUuid: string) =>
  mutationOptions({
    mutationFn: (body: RefundAccountRequest) =>
      api.put(
        `me/orders/${encodeURIComponent(orderUuid)}/refund-account`,
        MyOrderDetailSchema,
        body,
      ),
  });

// ─── 호스트 주문 처리(P13a) — 매니저 이상. 응답은 모두 처리 뒤 주문 상세(GR-2 모양) ───

const hostOrderPath = (eventId: string | number, orderUuid: string, action: string) =>
  `events/${encodeURIComponent(eventId)}/orders/${encodeURIComponent(orderUuid)}/${action}`;

/**
 * PR-3 승인. 검사 순서(`OrderApproveService` → `OrderValidator.validCanApproveOrder`): PG 주문 `Order_400_7` → 승인 대기 아님 `Order_400_3`
 * → 공연 OPEN 아님 `Event_400_5` → 시작 후 `Event_400_6` → 재고 `Ticket_Item_400_1` → 1인 제한 `Ticket_Item_400_6` → 탈퇴 `Order_400_14`.
 * 실패해도 주문은 승인 대기로 남는다
 */
export const approveOrderMutation = (eventId: string | number) =>
  mutationOptions({
    mutationFn: (orderUuid: string) =>
      api.post(hostOrderPath(eventId, orderUuid, 'approve'), HostOrderDetailSchema),
  });

/** PR-4 거절(승인 대기만). 유료면 환불 요청이 생긴다(0원은 없음) */
export const refuseOrderMutation = (eventId: string | number) =>
  mutationOptions({
    mutationFn: ({ orderUuid, body }: { orderUuid: string; body: RefuseOrderRequest }) =>
      api.post(hostOrderPath(eventId, orderUuid, 'refuse'), HostOrderDetailSchema, body),
  });

/** PR-5 승인 후 취소. 발급 티켓 취소·재고 복구, 유료면 환불 요청. 사유가 없으면 본문 없이 */
export const cancelHostOrderMutation = (eventId: string | number) =>
  mutationOptions({
    mutationFn: ({ orderUuid, body }: { orderUuid: string; body?: HostCancelOrderRequest }) =>
      api.post(hostOrderPath(eventId, orderUuid, 'cancel'), HostOrderDetailSchema, body),
  });

/** PF-2 환불 완료(환불 요청 주문만 — 아니면 `Order_400_17`, 이미 완료면 그대로 200) */
export const completeRefundMutation = (eventId: string | number) =>
  mutationOptions({
    mutationFn: (orderUuid: string) =>
      api.post(
        `events/${encodeURIComponent(eventId)}/refunds/${encodeURIComponent(orderUuid)}/complete`,
        HostOrderDetailSchema,
      ),
  });

/**
 * GR-6 주문 엑셀(매니저 이상 — 일반 멤버 403 `HOST_400_1`). GR-1과 같은 필터, 전체 행(1만 행 초과 `Order_400_19`).
 * 래퍼 없는 xlsx → `{ blob, filename }`. 페이지 파라미터는 보내지 않는다
 */
export const exportOrdersMutation = (eventId: string | number) =>
  mutationOptions({
    mutationFn: (params: Omit<HostOrdersParams, 'page' | 'size'> = {}) =>
      api.download(`events/${encodeURIComponent(eventId)}/orders/export`, {
        searchParams: normalizeHostOrdersParams(params),
      }),
  });
