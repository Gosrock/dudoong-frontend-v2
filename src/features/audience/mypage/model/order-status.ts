import type { MyOrderStatus, RefundStatus } from '@/api/order/schema';

/**
 * 사용자 주문 상태 5종 × `refundStatus` 3종 → 표시. **주문 상세(G11/O-3)가 쓴다**(plan P9, patterns §20). 주문 카드(목록 O-2)는
 * 같은 라벨에서 칩 3개만 고르는 `orderCardChip`을 쓴다(#381).
 * 라벨은 GUI 주문 카드 칩(`331:11519` — 승인대기·승인완료·승인거절)과 와이어 `128:2772`("주문취소완료")를 따른다.
 * 색은 의미(`tone`)만 정하고 실제 색은 V가 고른다.
 *
 * 서버 분류(`V2MyOrderStatus.of` @432cce4):
 * - `REFUNDED` = 사용자 취소 + 환불 요청·완료 — 요청/완료는 `refundStatus`로 가른다(라벨 자체가 바뀐다)
 * - `CANCELED` = 승인 후 호스트 취소, 또는 돌려줄 돈이 없는 사용자 취소(무료)
 * - `REFUSED`·`CANCELED`(호스트가 한 것)의 유료 주문은 `refundStatus`가 `REQUESTED`·`COMPLETED`일 수 있다 — 라벨은 그대로 두고
 *   환불 진행을 `refund`(보조 라벨)로 붙인다
 * - `status`가 `null`(결제 진행 중·실패 — 목록에 오지 않는다)이나 모르는 값은 "상태 확인 필요"
 */
export type OrderTone = 'waiting' | 'positive' | 'negative' | 'muted';

export type OrderStatusView = {
  label: string;
  tone: OrderTone;
  /** 환불 진행 보조 라벨(거절·호스트 취소된 유료 주문). 없으면 null */
  refund: string | null;
};

const STATUS_VIEW: Record<Exclude<MyOrderStatus, 'REFUNDED'>, Omit<OrderStatusView, 'refund'>> = {
  PENDING_APPROVE: { label: '승인대기', tone: 'waiting' },
  APPROVED: { label: '승인완료', tone: 'positive' },
  REFUSED: { label: '승인거절', tone: 'negative' },
  CANCELED: { label: '주문취소완료', tone: 'muted' },
  UNKNOWN: { label: '상태 확인 필요', tone: 'muted' },
};

/** 사용자 취소 환불(REFUNDED)은 환불 단계가 곧 상태다 */
const REFUNDED_VIEW: Record<RefundStatus, Omit<OrderStatusView, 'refund'>> = {
  REQUESTED: { label: '환불요청', tone: 'waiting' },
  COMPLETED: { label: '환불완료', tone: 'muted' },
  // 서버 분류상 생기지 않는다(REFUND + NONE은 CANCELED) — 취소로 본다
  NONE: { label: '주문취소완료', tone: 'muted' },
  UNKNOWN: { label: '환불 상태 확인 필요', tone: 'muted' },
};

const REFUND_SUFFIX: Record<RefundStatus, string | null> = {
  NONE: null,
  REQUESTED: '환불 대기',
  COMPLETED: '환불 완료',
  UNKNOWN: '환불 상태 확인 필요',
};

export function orderStatusView(
  status: MyOrderStatus | null,
  refundStatus: RefundStatus,
): OrderStatusView {
  if (status === 'REFUNDED') return { ...REFUNDED_VIEW[refundStatus], refund: null };
  const base = STATUS_VIEW[status ?? 'UNKNOWN'] ?? STATUS_VIEW.UNKNOWN;
  return { ...base, refund: REFUND_SUFFIX[refundStatus] ?? null };
}

/** 주문 카드(O-2)에 칩을 다는 상태 — GUI `1047:32381`에 그려진 3개뿐(#381, 2026-11-22 회의) */
const CARD_CHIP_STATUSES = ['PENDING_APPROVE', 'APPROVED', 'REFUSED'] as const;
type CardChipStatus = (typeof CARD_CHIP_STATUSES)[number];

const isCardChipStatus = (status: MyOrderStatus | null): status is CardChipStatus =>
  CARD_CHIP_STATUSES.includes(status as CardChipStatus);

/**
 * 주문 카드(목록 O-2) 상태 칩 — 승인대기 · 승인완료 · 승인거절만, 라벨 · 색은 상세(`orderStatusView`)와 같다.
 * - `CANCELED` · `REFUNDED`(·`null` · 모르는 값)는 칩 없음(`null`) — 자세한 상태는 주문 상세에서 본다
 * - "환불 대기" / "환불 완료" 보조 칩은 달지 않는다(`refund: null`) — 승인거절도 칩 하나(#381)
 */
export function orderCardChip(status: MyOrderStatus | null): OrderStatusView | null {
  if (!isCardChipStatus(status)) return null;
  return { ...STATUS_VIEW[status], refund: null };
}
