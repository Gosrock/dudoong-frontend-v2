import { mutationOptions } from '@tanstack/react-query';

import { api } from '../http';
import { type CreateOrderRequest, MyOrderDetailSchema } from './schema';

/**
 * P11/O-1 주문 생성(로그인). 응답은 G11/O-3과 같은 주문 상세다. 같은 사용자의 같은 요청이 10초 안에 다시 오면
 * 서버가 앞 주문을 돌려준다(`Idempotency-Key` 없음). 무료 선착순 확정이 실패하면 주문이 아니라 원래 에러가 온다.
 * 캐시 반영·이동은 화면(`useCheckout`)이 한다.
 */
export const createOrderMutation = () =>
  mutationOptions({
    mutationFn: (body: CreateOrderRequest) => api.post('me/orders', MyOrderDetailSchema, body),
  });
