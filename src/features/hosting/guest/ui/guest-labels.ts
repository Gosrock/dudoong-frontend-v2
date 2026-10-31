import type { z } from 'zod';

import type { HostGiftState } from '@/api/issued-ticket/schema';
import type { EntranceStateSchema, HostOrderStatus, RefundStatus } from '@/api/order/schema';
import { formatKstDotDateTimeWeekday, isKstDateTime } from '@/api/shared/date';
import type { TicketPayType } from '@/api/ticket-item/schema';
import type { ChipColor, ChipTheme } from '@/ui/components/Chip/Chip';

type EntranceState = z.infer<typeof EntranceStateSchema>;

/**
 * 예매자 관리 화면 글자(P13a-V, 와이어 `424:11710`·`424:12014` 문구). 상태 칩 색은 와이어의 색 구분(승인 완료 초록 · 거절·취소 빨강 ·
 * 실패 회색 테두리)을 DS `Chip`으로 옮겼다 — 승인 대기 칩은 와이어에 없어(버튼만) 보라로 정했다(Claude 판단).
 */

type ChipStyle = { label: string; color: ChipColor; theme: ChipTheme };

export const ORDER_STATUS_CHIP: Record<HostOrderStatus, ChipStyle> = {
  PENDING_APPROVE: { label: '승인 대기', color: 'violet', theme: 'weak' },
  APPROVED: { label: '승인 완료', color: 'green', theme: 'weak' },
  REFUSED: { label: '승인 거절', color: 'red', theme: 'weak' },
  CANCELED: { label: '주문 취소', color: 'red', theme: 'weak' },
  FAILED: { label: '주문 실패', color: 'grey', theme: 'border' },
  UNKNOWN: { label: '알 수 없음', color: 'grey', theme: 'border' },
};

export const orderStatusChipOf = (status: HostOrderStatus | null): ChipStyle =>
  ORDER_STATUS_CHIP[status ?? 'UNKNOWN'];

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

export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** 서버 일시 → "2026.03.22 (일) 10:05". 형식이 아니면 그대로 */
export const dateTimeText = (v: string | null) =>
  v === null ? '—' : isKstDateTime(v) ? formatKstDotDateTimeWeekday(v) : v;

export const text = (v: string | null | undefined) =>
  v === null || v === undefined || v === '' ? '—' : v;
