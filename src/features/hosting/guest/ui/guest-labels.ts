import type { z } from 'zod';

import type { HostGiftState } from '@/api/issued-ticket/schema';
import type { EntranceStateSchema, HostOrderStatus, RefundStatus } from '@/api/order/schema';
import { formatKstDotDateTimeWeekday, isKstDateTime } from '@/api/shared/date';
import type { TicketPayType } from '@/api/ticket-item/schema';
import type { ChipColor, ChipTheme } from '@/ui/components/Chip/Chip';

import type { RefundRowState } from '../model/guest-rules';

type EntranceState = z.infer<typeof EntranceStateSchema>;

/**
 * 예매자 관리 화면 글자 · 칩(GUI 2026-11-01 Ready — DS `tag_v2` small · round). 주문 상태: 승인 대기 grey weak(`1029:6893`) ·
 * 승인 완료 green weak · 승인 거절 red weak · 주문 실패 grey weak · 주문 취소 red weak(표 `1026:4634`… — 상세 `1029:8522`는 grey weak,
 * 표를 따른다 — design-requests Q100)
 */

type ChipStyle = { label: string; color: ChipColor; theme: ChipTheme };

export const ORDER_STATUS_CHIP: Record<HostOrderStatus, ChipStyle> = {
  PENDING_APPROVE: { label: '승인 대기', color: 'grey', theme: 'weak' },
  APPROVED: { label: '승인 완료', color: 'green', theme: 'weak' },
  REFUSED: { label: '승인 거절', color: 'red', theme: 'weak' },
  CANCELED: { label: '주문 취소', color: 'red', theme: 'weak' },
  FAILED: { label: '주문 실패', color: 'grey', theme: 'weak' },
  UNKNOWN: { label: '알 수 없음', color: 'grey', theme: 'border' },
};

export const orderStatusChipOf = (status: HostOrderStatus | null): ChipStyle =>
  ORDER_STATUS_CHIP[status ?? 'UNKNOWN'];

/** 환불 상태 칩(GUI `1031:9517` 환불 요청 purple weak · `1031:9532` 계좌 입력 전 grey border · `1029:8908` 환불 완료 green weak) */
export const REFUND_STATE_CHIP: Record<Exclude<RefundRowState, null>, ChipStyle> = {
  REQUESTED: { label: '환불 요청', color: 'purple', theme: 'weak' },
  NO_ACCOUNT: { label: '계좌 입력 전', color: 'grey', theme: 'border' },
  COMPLETED: { label: '환불 완료', color: 'green', theme: 'weak' },
};

/** 발급 티켓 입장 칩 — 표는 입장 완료 green weak(`1030:8409`), 카드·상세는 border(`1029:7901` · `1030:9115`) */
export const entranceChipOf = (entrance: EntranceState, theme: 'weak' | 'border'): ChipStyle =>
  entrance === 'DONE'
    ? { label: '입장 완료', color: 'green', theme }
    : entrance === 'CANCELED'
      ? { label: '취소된 티켓', color: 'red', theme: 'border' }
      : { label: '입장 전', color: 'grey', theme: 'border' };

/** 주문 상세 "주문한 티켓" 카드 — 발급 전(`1029:6914` grey border) */
export const NOT_ISSUED_CHIP: ChipStyle = { label: '발급 전', color: 'grey', theme: 'border' };

/** 티켓 종류 칩(`1029:6912` "두둥 티켓" violet weak). 무료·유료는 GUI에 없어 같은 모양으로(🤖) */
export const PAY_TYPE_CHIP_LABEL: Record<TicketPayType, string | null> = {
  DUDOONG: '두둥 티켓',
  FREE: '무료 티켓',
  PRICE: '유료 티켓',
  UNKNOWN: null,
};

/** 와이어 "환불 여부" 열 — 없으면 빈 칸 */
export const REFUND_STATUS_LABEL: Record<RefundStatus, string> = {
  NONE: '',
  REQUESTED: '환불 요청',
  COMPLETED: '환불 완료',
  UNKNOWN: '',
};

export const ENTRANCE_LABEL: Record<EntranceState, string> = {
  BEFORE: '입장 전',
  DONE: '입장 완료',
  CANCELED: '취소된 티켓',
  UNKNOWN: '알 수 없음',
};

/** 와이어 "체크인" 열 — 입장했으면 입장 시각, 아니면 "입장 전" */
export const entranceTextOf = (entrance: EntranceState, enteredAt: string | null) =>
  entrance === 'DONE' && enteredAt ? dateTimeText(enteredAt) : ENTRANCE_LABEL[entrance];

/** 발급 티켓 선물 상태(`ownerName`과 같이 보인다) — 선물이 없으면 빈 칸 */
export const GIFT_STATE_LABEL: Record<HostGiftState, string> = {
  NONE: '',
  PENDING: '선물 대기',
  ACCEPTED: '선물 받음',
  UNKNOWN: '',
};

/** 와이어 "티켓 종류" 칩 */
export const PAY_TYPE_LABEL: Record<TicketPayType, string> = {
  DUDOONG: '두둥',
  FREE: '무료',
  PRICE: '유료',
  UNKNOWN: '—',
};

export { formatWon as won } from '@/utils/money';

/** 서버 일시 → "2026.03.25"(환불 계좌 수정일 · 환불 완료일 — GUI `1029:8733`) */
export const dateText = (v: string | null) => (v === null ? '—' : dateTimeText(v).slice(0, 10));

/** 서버 일시 → "2026.03.22 (일) 10:05". 형식이 아니면 그대로 */
export const dateTimeText = (v: string | null) =>
  v === null ? '—' : isKstDateTime(v) ? formatKstDotDateTimeWeekday(v) : v;

export const text = (v: string | null | undefined) =>
  v === null || v === undefined || v === '' ? '—' : v;
