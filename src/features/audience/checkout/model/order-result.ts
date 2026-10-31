import type { MyOrderDetail } from '@/api/order/schema';

/**
 * 주문 완료(`/orders/[orderUuid]?created=1`, tech-decisions §3·§19). 생성 응답을 G11/O-3 키에 넣고 이 주소로 `replace`한다.
 * `created=1`은 완료 문구를 보일지만 정한다 — 내용은 언제나 G11/O-3(캐시 또는 다시 조회)로 그린다.
 */
export const orderCreatedHref = (orderUuid: string) =>
  `/orders/${encodeURIComponent(orderUuid)}?created=1`;

export const isCreatedParam = (value: string | string[] | undefined | null) =>
  (Array.isArray(value) ? value[0] : value) === '1';

/**
 * 완료 안내 분기(3분기 — api-contract §6 F5).
 * - `AWAITING_DEPOSIT_APPROVAL` 입금형: 승인 대기, 호스트가 입금을 확인하면 발급
 * - `AWAITING_APPROVAL` 무료 승인형: 승인 대기
 * - `ISSUED` 무료 선착순: 즉시 발급
 * - `OTHER` 그 밖(완료 주소에서 새로고침했는데 그 사이 거절·취소됐거나, 모르는 상태)
 */
export type OrderResultKind =
  'AWAITING_DEPOSIT_APPROVAL' | 'AWAITING_APPROVAL' | 'ISSUED' | 'OTHER';

export function orderResultKind(order: Pick<MyOrderDetail, 'status' | 'payment'>): OrderResultKind {
  if (order.status === 'PENDING_APPROVE') {
    return order.payment ? 'AWAITING_DEPOSIT_APPROVAL' : 'AWAITING_APPROVAL';
  }
  if (order.status === 'APPROVED') return 'ISSUED';
  return 'OTHER';
}

/**
 * 완료 안내 문구(P7-V). 승인 대기 둘은 GUI `939:27829` 글자 그대로, 즉시 발급·그 밖은 GUI에 없어 정했다(디자인 없음 — Figma 코멘트).
 * 계좌·금액은 Q16 기본안대로 완료 화면에 다시 보이지 않고 주문상세에서 본다
 */
export const ORDER_RESULT_MESSAGE: Record<OrderResultKind, string> = {
  AWAITING_DEPOSIT_APPROVAL: '티켓 승인여부는 티켓 페이지에서 확인 가능합니다!',
  AWAITING_APPROVAL: '티켓 승인여부는 티켓 페이지에서 확인 가능합니다!',
  ISSUED: '티켓이 발급됐어요. 티켓 페이지에서 확인해 주세요!',
  OTHER: '주문 상태는 주문내역에서 확인해 주세요.',
};
