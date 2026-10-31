import type { MyOrderDetail, RefuseReasonType } from '@/api/order/schema';

/**
 * 주문상세(G11/O-3) 규칙(plan P9, patterns §20). 버튼 노출은 서버 플래그로만 정한다 — 주문취소 = `canCancel`,
 * 환불 계좌 입구 = `canEditRefundAccount`, 입력 유도 = `refundAccountRequired`. 여기서는 그 플래그를 화면이 쓸 모양으로 바꾸고,
 * 서버가 주지 않는 판정(선물 때문에 막힌 취소)만 계산한다.
 */

type Order = Pick<
  MyOrderDetail,
  'status' | 'canCancel' | 'event' | 'issuedTickets' | 'payment' | 'ticket'
>;

/** 유료(총액 > 0) 주문 — 취소에 환불 계좌가 필요하다(`V2UserOrderDomainService.isPaid` — `Order_400_25`) */
export const isPaidOrder = (order: Pick<MyOrderDetail, 'payment'>) =>
  (order.payment?.totalAmount ?? 0) > 0;

export const GIFT_BLOCKS_CANCEL_MESSAGE = '선물을 먼저 취소하거나 돌려받아 주세요';

/**
 * 선물 때문에 취소할 수 없는지(patterns §20 조건 그대로). 서버 `cancelBlocker`가 공연 OPEN·시작 전을 먼저 보고 차단 티켓을 나중에
 * 보므로, 공연 시작 뒤·입장 티켓이 있는 주문·호스트가 취소한 주문에는 뜨지 않게 좁힌다.
 * **삭제된 공연(`event: null`)은 판정 전에 거른다**(#789 — `canCancel=false`로 오지만 선물 안내 대상이 아니다).
 */
export function giftBlocksCancel(order: Order): boolean {
  if (order.event === null) return false;
  return (
    !order.canCancel &&
    order.status === 'APPROVED' &&
    order.event.displayStatus === 'UPCOMING' &&
    !order.issuedTickets.some((t) => t.entrance === 'DONE') &&
    order.issuedTickets.some(
      (t) => (t.giftState === 'PENDING' || t.giftState === 'SENT') && t.entrance !== 'CANCELED',
    )
  );
}

/**
 * [주문취소] 자리.
 * - `cancel` — `canCancel`. `refundAccount`가 true면 유료라 환불 계좌를 받아야 요청된다(무료는 확인만)
 * - `giftNotice` — 버튼 대신 선물 안내(위 조건)
 * - `none` — 아무것도 없음
 */
export type CancelEntry =
  | { kind: 'cancel'; refundAccount: boolean }
  | { kind: 'giftNotice'; message: string }
  | { kind: 'none' };

export function cancelEntry(order: Order): CancelEntry {
  if (order.canCancel && order.event !== null) {
    return { kind: 'cancel', refundAccount: isPaidOrder(order) };
  }
  if (giftBlocksCancel(order)) return { kind: 'giftNotice', message: GIFT_BLOCKS_CANCEL_MESSAGE };
  return { kind: 'none' };
}

/**
 * 환불 계좌 입구(P11/O-5). `canEditRefundAccount`일 때만 연다.
 * - `mode` — 계좌가 아직 없으면 `input`, 있으면 `edit`(수정은 전체를 다시 입력받는다 — `maskedAccountNumber`만 온다)
 * - `prompt` — 입력 유도(`refundAccountRequired`). 입금 미확인 거절은 서버가 false로 준다(입구는 그대로)
 */
export type RefundAccountEntry =
  { kind: 'none' } | { kind: 'open'; mode: 'input' | 'edit'; prompt: boolean };

export function refundAccountEntry(
  order: Pick<MyOrderDetail, 'canEditRefundAccount' | 'refundAccountRequired' | 'refundAccount'>,
): RefundAccountEntry {
  if (!order.canEditRefundAccount) return { kind: 'none' };
  return {
    kind: 'open',
    mode: order.refundAccount ? 'edit' : 'input',
    prompt: order.refundAccountRequired,
  };
}

/**
 * 거절 사유 고정 문구(GUI 승인거절 3종 `331:11330`·`331:11393`·`331:11456`의 사유 박스). `ETC`만 호스트가 쓴 `refuseReason`.
 * 모르는 값·v1 거절(종류 없음)은 서버 문구가 있으면 그것을 쓴다.
 */
export const REFUSE_REASON_LABEL: Record<Exclude<RefuseReasonType, 'ETC' | 'UNKNOWN'>, string> = {
  DEPOSIT_UNCONFIRMED: '입금 미확인',
  AMOUNT_MISMATCH: '결제 금액 오류',
  SOLD_OUT: '티켓 매진',
};

export function refuseReasonText(
  order: Pick<MyOrderDetail, 'status' | 'refuseReasonType' | 'refuseReason'>,
): string | null {
  if (order.status !== 'REFUSED') return null;
  const type = order.refuseReasonType;
  if (type && type !== 'ETC' && type !== 'UNKNOWN') return REFUSE_REASON_LABEL[type];
  return order.refuseReason ?? (type === 'ETC' ? '기타' : null);
}

/** 금액 구성 — 티켓금액·옵션금액·총액. v2에는 할인이 없어 그리지 않는다(Q12). 무료는 null */
export function orderAmounts(order: Pick<MyOrderDetail, 'payment'>) {
  if (!order.payment) return null;
  const { ticketAmount, optionAmount, totalAmount } = order.payment;
  return { ticketAmount, optionAmount, totalAmount };
}

/**
 * 옵션 표시: 줄이 하나면 "모든 티켓에 같은 옵션"(`all`), 여럿이면 티켓별(`perTicket`), 옵션 답이 없으면 `none`.
 * 승인 대기 주문은 발급 티켓이 없어 옵션 답은 `lines`에서만 읽는다(storyboard D).
 */
export function optionMode(order: Pick<MyOrderDetail, 'lines'>): 'none' | 'all' | 'perTicket' {
  if (order.lines.every((l) => l.optionAnswers.length === 0)) return 'none';
  return order.lines.length > 1 ? 'perTicket' : 'all';
}

/**
 * 취소 영역의 약관 안내 종류(legal-copy A-8 — 문구 원문은 V). 두둥 = `payType === 'DUDOONG'`, 무료 = `FREE`.
 * `pendingApproval`은 두둥 ⑤-b("입금 후 승인 전에는 앱에서 취소할 수 없습니다")를 붙일 조건(`PENDING_APPROVE`) — **위험(B18)**:
 * 서버 `canCancel`은 이 주문에서 true라 [주문취소]가 같이 보인다. 동작은 서버 값 그대로 둔다(plan P9).
 */
export function cancelNotice(
  order: Pick<MyOrderDetail, 'ticket' | 'status'>,
): { kind: 'DUDOONG' | 'FREE'; pendingApproval: boolean } | null {
  const payType = order.ticket.payType;
  if (payType === 'DUDOONG') {
    return { kind: 'DUDOONG', pendingApproval: order.status === 'PENDING_APPROVE' };
  }
  if (payType === 'FREE') return { kind: 'FREE', pendingApproval: false };
  return null;
}

/** 취소 응답 → 결과. 유료는 환불 요청(`REFUNDED` + `REQUESTED`), 무료는 바로 취소(`CANCELED`) */
export function cancelResult(
  order: Pick<MyOrderDetail, 'status' | 'refundStatus'>,
): 'refundRequested' | 'canceled' | 'unknown' {
  if (order.status === 'REFUNDED' && order.refundStatus === 'REQUESTED') return 'refundRequested';
  if (order.status === 'CANCELED') return 'canceled';
  return 'unknown';
}
