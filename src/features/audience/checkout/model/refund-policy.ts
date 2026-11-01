import { isPreApprovalCancelTermsEffective } from '@/api/shared/agreement';
import type { TicketPayType } from '@/api/ticket-item/schema';

/**
 * 체크아웃 환불 규정 — legal-copy **A-7 원문**(약관 제27조②). 빼거나 바꾸지 않는다(정본은 legal-copy A-7).
 * - 두둥 ⑤는 v1 문구를 쓰지 않고 "B18 확정 문구"(A-7 ⑤, 백엔드 #897) — 개정 약관 제27조③ 시행(2026-11-07 KST) 뒤에만. 그 전에는 뺀다
 * - ④ "호스트에게 연락해 환불받을 계좌를 알려주세요"는 v1 동작 기준이다(v2는 취소할 때 앱에서 계좌를 받는다 — legal-copy "v2 계획과 다른 점
 *   공통"). 약관 근거 문구라 원문 그대로 두고 운영 확인을 backend-questions B28로 물었다
 * - v1 운영에서 이 목록은 체크아웃 "판매정보" 아코디언에 있었다. v2 체크아웃 GUI(`564:4156`)에는 자리가 없어 이슈 #105로 붙였다(design-requests Q79)
 */
export const REFUND_DEADLINE = { label: '취소 기한', value: '공연 시작 전 까지' } as const;

const DUDOONG_BEFORE_5 = [
  '취소기한 이전까지 수수료 없이 취소 가능합니다.',
  '공연 입장확인이 된 티켓이 있을경우 취소가 불가합니다.',
  '두둥티켓은 호스트 계좌로 입금하는 티켓이라, 예매를 취소해도 자동으로 환불되지 않습니다.',
  '환불 방법 : 티켓 예매 상세내역>예매취소 후 호스트에게 연락해 환불받을 계좌를 알려주세요. 연락처는 공연 상세 페이지에서 확인할 수 있습니다.',
] as const;

/** A-7 ⑤ — B18 확정 문구(2026-11-07 시행 뒤) */
const DUDOONG_5 =
  '입금 후 승인 전에도 취소할 수 있습니다. 이미 입금했다면 취소할 때 입력한 환불 계좌로 호스트가 환불합니다.';

const DUDOONG_6 =
  '호스트가 공연 상세에 별도의 환불 기준(예: 공연 당일 환불 불가)을 안내했다면, 구매자가 취소할 때의 환불은 그 기준을 따르므로 앱에서 취소할 수 있어도 환불이 제한될 수 있습니다. 호스트가 주문을 거절·취소하거나 공연이 취소된 경우에는 전액 환불됩니다.';

const FREE_ITEMS = [
  '취소기한 이전까지 취소할 수 있습니다.',
  '공연 입장확인이 된 티켓이 있을경우 취소가 불가합니다.',
  '취소 방법 : 티켓 예매 상세내역>예매취소',
] as const;

/** 고른 티켓의 환불 규정 목록. 두둥·무료 밖(v2에 없는 PG 유료 등)은 null — 그리지 않는다 */
export function refundPolicyItems(
  payType: TicketPayType | null | undefined,
  now: number = Date.now(),
): readonly string[] | null {
  if (payType === 'DUDOONG') {
    return [
      ...DUDOONG_BEFORE_5,
      ...(isPreApprovalCancelTermsEffective(now) ? [DUDOONG_5] : []),
      DUDOONG_6,
    ];
  }
  if (payType === 'FREE') return FREE_ITEMS;
  return null;
}
