import { isKstDateTime } from '@/api/shared/date';

/** 주문 날짜(와이어 카드 왼쪽 위 "2026.03.05") — `orderedAt`의 날짜 부분 */
export const orderDateLabel = (orderedAt: string | null) =>
  orderedAt && isKstDateTime(orderedAt) ? orderedAt.slice(0, 10) : null;

/**
 * 거절 사유 박스 설명(와이어 `128:2583`·`128:2646`·`128:2709` 글자 그대로). `ETC`·모르는 값은 호스트가 쓴 사유(`refuseReasonText`)만 보이고
 * 설명은 없다(ETC 화면은 와이어·GUI에 없다 — plan P9).
 */
export const REFUSE_REASON_DESCRIPTION: Partial<Record<string, string>> = {
  DEPOSIT_UNCONFIRMED:
    '입금 내역을 찾을 수 없습니다.\n입금자명을 다시 확인 후 호스트에게 문의바랍니다.',
  AMOUNT_MISMATCH:
    '결제금액와 송금액이 일치하지 않습니다.\n추가적인 조치는 호스트에게 문의바랍니다.',
  SOLD_OUT: '주문하신 티켓이 매진되었습니다.\n티켓 환불에 관해 호스트에게 문의바랍니다.',
};

/**
 * 결제방식 한 줄(plan P9 — `paymentChannel` 하나만). 체크아웃 GUI `564:4156`(Ready for dev) 결제방식 버튼 글자 "토스간편송금" · "계좌이체"를 따른다
 * (코드 패턴 점검 A38 — 와이어 `128:2263`의 "직접계좌이체"에서 맞춤). 표는 체크아웃 `CHANNEL_LABEL`과 따로 둔다(점검 §4 — FREE를 포함)
 */
export const PAYMENT_CHANNEL_LABEL: Record<string, string> = {
  BANK_TRANSFER: '계좌이체',
  TOSS_TRANSFER: '토스간편송금',
  FREE: '무료',
};

/**
 * 발급 티켓 한 장의 "티켓상태"(와이어 `498:703` — 승인완료 · 선물중). 선물 · 입장이 주문 상태보다 먼저 보인다.
 * 와이어에 없는 값(선물완료 · 입장 완료 · 취소됨)은 티켓탭(P8) 상태 이름을 따랐다(🤖 — A38에서 "입장완료" → 티켓탭과 같은 "입장 완료").
 * 선물 대기는 와이어 "선물중"을 둔다 — GUI `908:3276`에도 "선물중인 티켓"과 "‘선물 대기’ 상태"가 같이 있어 하나로 정할 근거가 없다.
 */
export function issuedTicketStateLabel(
  t: { giftState: string; entrance: string },
  orderLabel: string,
): { label: string; tone: 'positive' | 'waiting' | 'negative' | 'muted' | 'gift' } {
  if (t.entrance === 'CANCELED') return { label: '취소됨', tone: 'muted' };
  if (t.giftState === 'PENDING') return { label: '선물중', tone: 'gift' };
  if (t.giftState === 'SENT') return { label: '선물완료', tone: 'gift' };
  if (t.entrance === 'DONE') return { label: '입장 완료', tone: 'muted' };
  return { label: orderLabel, tone: 'positive' };
}
