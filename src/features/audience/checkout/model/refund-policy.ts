import type { TicketPayType } from '@/api/ticket-item/schema';

/**
 * 체크아웃 환불 규정 — legal-copy **A-7 "BE-274 확정 문구"**(백엔드 #274 §2 제안 원문, Api 2.5.15 · WorkBook DEC-041). 빼거나 바꾸지 않는다
 * (정본은 legal-copy A-7).
 * - v2는 계좌이체(두둥티켓)·무료뿐이고 두둥은 대금을 받지 않는다 — 카드 결제 · "카드사 영업일 기준 4~5일" 류 문구는 쓰지 않는다
 * - 원문이 두둥·무료를 한 목록에 같이 적어 결제 방식과 상관없이 네 줄 모두 보인다(🤖 "제안 원문 그대로")
 * - 이전 A-7(v1 원문 + B18 ⑤ · B28 ④, 2026-11-02~11-16)은 legal-copy에 기록으로 남겼다
 * - v1 운영에서 이 목록은 체크아웃 "판매정보" 아코디언에 있었다. v2 체크아웃 GUI(`564:4156`)에는 자리가 없어 이슈 #105로 붙였다(design-requests Q79)
 */
export const REFUND_DEADLINE = { label: '취소 기한', value: '공연 시작 전 까지' } as const;

/** 백엔드 #274 §2 "결제 화면 환불 규정" 제안 원문 네 줄 */
export const REFUND_POLICY_ITEMS = [
  '취소 기한: 공연 시작 전까지 티켓 예매 상세 > 예매 취소에서 직접 취소할 수 있습니다. 입장 확인된 티켓, 선물 중이거나 선물한 티켓이 있으면 취소할 수 없습니다.',
  '두둥티켓(계좌이체): 대금은 호스트 계좌로 직접 입금되며 두둥에서 자동으로 환불되지 않습니다. 취소할 때 환불받을 계좌를 입력하면 호스트가 확인 후 지체 없이 송금합니다.',
  '호스트가 예매 전에 공연 상세에 게시한 취소·환불 기준이 있으면 그 기준이 우선합니다. 단, 승인 거절·공연 취소 등 호스트 사유로 인한 취소는 전액 환불됩니다.',
  '무료 티켓은 취소하면 바로 반영됩니다. 환불 문의는 호스트 연락처 또는 두둥 카카오톡 채널로 해 주세요.',
] as const;

/** 고른 티켓의 환불 규정 목록. 두둥·무료 밖(v2에 없는 PG 유료 등)은 null — 그리지 않는다 */
export function refundPolicyItems(
  payType: TicketPayType | null | undefined,
): readonly string[] | null {
  if (payType === 'DUDOONG' || payType === 'FREE') return REFUND_POLICY_ITEMS;
  return null;
}
