import type { EventDisplayStatus } from '@/api/event/schema';
import { isKstDateTime } from '@/api/shared/date';

/** KST 날짜(자정 기준)의 일 수. `yyyy.MM.dd HH:mm` 문자열 → 1970-01-01부터 며칠째인지 */
function kstDayIndex(value: string): number {
  const [y, m, d] = value.slice(0, 10).split('.').map(Number);
  return Math.floor(Date.UTC(y!, m! - 1, d!) / 86_400_000);
}

function todayKstIndex(now: Date): number {
  return Math.floor((now.getTime() + 9 * 3_600_000) / 86_400_000);
}

/**
 * 주문 카드 포스터 위 배지(와이어 `128:2772` — "D-13" · "공연종료"). O-2·O-3 공연 응답에는 `dDay`가 없어 `startAt`(KST)으로 계산한다
 * (design-requests Q29 기본안 — 서버 `V2EventDisplayRule.dDayOf`와 같은 규칙: KST 날짜 차이, 당일 D-DAY).
 * 공연 중은 "공연 중", 지난 공연은 "공연종료", 모르는 상태·시각 없음은 null(배지 없음).
 */
export function orderPosterBadge(
  event: { displayStatus: EventDisplayStatus; startAt: string | null } | null,
  now: Date,
): string | null {
  if (!event) return null;
  switch (event.displayStatus) {
    case 'PAST':
      return '공연종료';
    case 'ONGOING':
      return '공연 중';
    case 'UPCOMING': {
      if (!event.startAt || !isKstDateTime(event.startAt)) return null;
      const days = kstDayIndex(event.startAt) - todayKstIndex(now);
      if (days < 0) return null;
      return days === 0 ? 'D-DAY' : `D-${days}`;
    }
    default:
      return null;
  }
}

/** 주문 날짜(와이어 카드 왼쪽 위 "2026.03.05") — `orderedAt`의 날짜 부분 */
export const orderDateLabel = (orderedAt: string | null) =>
  orderedAt && isKstDateTime(orderedAt) ? orderedAt.slice(0, 10) : null;

/** 금액 표시 — 무료는 "무료" */
export const wonLabel = (amount: number) =>
  amount === 0 ? '무료' : `${amount.toLocaleString('ko-KR')}원`;

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

/** 결제방식 한 줄(plan P9 — `paymentChannel` 하나만). 와이어 `128:2263` "직접계좌이체", 체크아웃 GUI "토스간편송금" */
export const PAYMENT_CHANNEL_LABEL: Record<string, string> = {
  BANK_TRANSFER: '직접계좌이체',
  TOSS_TRANSFER: '토스간편송금',
  FREE: '무료',
};

/**
 * 발급 티켓 한 장의 "티켓상태"(와이어 `498:703` — 승인완료 · 선물중). 선물 · 입장이 주문 상태보다 먼저 보인다.
 * 와이어에 없는 값(선물완료 · 입장완료 · 취소됨)은 티켓탭(P8) 상태 이름을 따랐다(🤖).
 */
export function issuedTicketStateLabel(
  t: { giftState: string; entrance: string },
  orderLabel: string,
): { label: string; tone: 'positive' | 'waiting' | 'negative' | 'muted' | 'gift' } {
  if (t.entrance === 'CANCELED') return { label: '취소됨', tone: 'muted' };
  if (t.giftState === 'PENDING') return { label: '선물중', tone: 'gift' };
  if (t.giftState === 'SENT') return { label: '선물완료', tone: 'gift' };
  if (t.entrance === 'DONE') return { label: '입장완료', tone: 'muted' };
  return { label: orderLabel, tone: 'positive' };
}
