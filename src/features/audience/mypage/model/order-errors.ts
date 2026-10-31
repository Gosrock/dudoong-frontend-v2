import type { MyOrderDetail } from '@/api/order/schema';

import { GIFT_BLOCKS_CANCEL_MESSAGE, giftBlocksCancel } from './order-detail';

/**
 * 주문 취소(P11/O-4)·환불 계좌(P11/O-5)에서 화면이 처리하는 코드(patterns §24 P9 행). `handleError` 표로 쓰고, 표에 없는 코드는 공용 토스트(`reason`).
 * `refetch` — 처리 뒤 G11/O-3을 다시 읽는다(409가 없어 "이미 처리됨"은 400 — patterns §11).
 */
export type OrderActionOutcome = {
  refetch: boolean;
  /** 화면에 보일 안내. `null`이면 다시 읽은 주문으로 정한다(`Order_400_24`) */
  message: string | null;
  /** 환불 계좌가 필요하다는 신호(유료 취소에 계좌 없음 — 화면이 계좌 시트를 연다) */
  refundAccountMissing?: true;
};

export const CANCEL_ERROR_TABLE = {
  /** 이미 취소·거절됨 */
  Order_400_5: { refetch: true, message: '이미 취소되었거나 취소할 수 없는 주문이에요' },
  /** 입장 완료·다른 사람 소유·선물 대기 티켓 — 다시 읽은 주문이 선물 조건이면 선물 안내 */
  Order_400_24: { refetch: true, message: null },
  /** 공연이 OPEN이 아님(`canCancel`로 미리 숨는다) */
  Event_400_5: { refetch: true, message: '지금은 취소할 수 없는 공연이에요' },
  /** 공연 시작 후(`canCancel`로 미리 숨는다) */
  Order_400_9: { refetch: true, message: '공연이 시작되어 취소할 수 없어요' },
  /** 유료 취소에 환불 계좌 없음 */
  Order_400_25: {
    refetch: false,
    message: '환불받을 계좌를 입력해 주세요',
    refundAccountMissing: true,
  },
} as const satisfies Record<string, OrderActionOutcome>;

export const REFUND_ACCOUNT_ERROR_TABLE = {
  /** 입력할 수 없는 주문(환불 요청 상태가 아님 등) */
  Order_400_27: { refetch: true, message: '환불 계좌를 입력할 수 없는 주문이에요' },
  /** 이미 환불 완료 */
  Order_400_28: { refetch: true, message: '이미 환불이 완료된 주문이에요' },
  /** 정규화 뒤 빈 값(공백만) */
  Order_400_25: { refetch: false, message: '환불받을 계좌를 다시 확인해 주세요' },
} as const satisfies Record<string, OrderActionOutcome>;

/** `Order_400_24`를 받고 다시 읽은 주문으로 안내를 정한다 */
export const NOT_CANCELABLE_MESSAGE = '취소할 수 없는 주문이에요';
export function messageAfterCancelBlocked(order: MyOrderDetail | undefined): string {
  return order && giftBlocksCancel(order) ? GIFT_BLOCKS_CANCEL_MESSAGE : NOT_CANCELABLE_MESSAGE;
}
