import { mutationOptions } from '@tanstack/react-query';

import { api } from '../http';
import {
  type CancelMyOrderRequest,
  type CreateOrderRequest,
  MyOrderDetailSchema,
  type RefundAccountRequest,
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
