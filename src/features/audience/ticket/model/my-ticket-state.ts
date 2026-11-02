import type { MyTicketDetail, MyTicketElement, MyTicketState } from '@/api/my-ticket/schema';

/**
 * 티켓 `state` 11값 + UNKNOWN → 표시(patterns §17). 라벨은 GUI 상태 칩·`455:8958` 배지 문구를 따른다.
 * 색은 의미(`tone`)만 정하고 실제 색은 V가 고른다.
 */
export type TicketTone = 'positive' | 'waiting' | 'gift' | 'muted' | 'negative';

export type TicketStateView = { label: string; tone: TicketTone };

export const TICKET_STATE_VIEW: Record<MyTicketState, TicketStateView> = {
  PENDING_APPROVE: { label: '승인 대기', tone: 'waiting' },
  REFUSED: { label: '승인 거절', tone: 'negative' },
  APPROVED: { label: '승인완료', tone: 'positive' },
  GIFT_PENDING: { label: '선물 대기중', tone: 'gift' },
  GIFT_EXPIRED: { label: '선물 만료', tone: 'negative' },
  GIFT_SENT: { label: '선물완료', tone: 'muted' },
  RECEIVED: { label: '받은 선물', tone: 'gift' },
  ENTERED: { label: '입장 완료', tone: 'muted' },
  CANCELED: { label: '취소됨', tone: 'negative' },
  REFUND_REQUESTED: { label: '환불 요청', tone: 'waiting' },
  REFUNDED: { label: '환불 완료', tone: 'muted' },
  UNKNOWN: { label: '상태 확인 필요', tone: 'muted' },
};

/** 배지 순서(묶음 카드의 `counts`) */
export const TICKET_STATE_ORDER: readonly MyTicketState[] = [
  'PENDING_APPROVE',
  'REFUSED',
  'APPROVED',
  'RECEIVED',
  'GIFT_PENDING',
  'GIFT_EXPIRED',
  'GIFT_SENT',
  'ENTERED',
  'REFUND_REQUESTED',
  'REFUNDED',
  'CANCELED',
  'UNKNOWN',
];

/** 승인 없이 바로 발급된(무료 선착순) 티켓의 '승인완료' 대신(design-requests Q74 기본안, 백엔드 #924) */
export const ISSUED_WITHOUT_APPROVAL: TicketStateView = { label: '발급 완료', tone: 'positive' };

/**
 * 상태 → 표시. `approvalRequired`(T-1 묶음 — 백엔드 #924, 2.5.6)가 `false`면 '승인완료'를 '발급 완료'로.
 * 값이 없으면(운영 2.5.3 응답 · T-2 상세) 지금처럼 '승인완료'
 */
export const ticketStateView = (
  state: MyTicketState,
  approvalRequired?: boolean,
): TicketStateView =>
  state === 'APPROVED' && approvalRequired === false
    ? ISSUED_WITHOUT_APPROVAL
    : (TICKET_STATE_VIEW[state] ?? TICKET_STATE_VIEW.UNKNOWN);

/**
 * 카드를 눌렀을 때 열 상세. 티켓 uuid가 있으면 T-2, 선물 완료(SENT, uuid 없음)는 GG-7a(`giftId`).
 * 둘 다 없으면 열지 않는다(null).
 */
export type TicketTarget =
  { kind: 'ticket'; ticketUuid: string } | { kind: 'sentGift'; giftId: number };

export function cardTarget(
  el: Pick<MyTicketElement, 'ticketUuid' | 'giftId' | 'giftState'>,
): TicketTarget | null {
  if (el.ticketUuid) return { kind: 'ticket', ticketUuid: el.ticketUuid };
  if (el.giftState === 'SENT' && el.giftId !== null) return { kind: 'sentGift', giftId: el.giftId };
  return null;
}

/** 입장 QR 자리에 무엇을 둘지. `qr`의 값은 서버 `qrValue`(= 티켓 uuid) 그대로 — 가공하지 않는다 */
export type EntryQr =
  { kind: 'qr'; value: string } | { kind: 'notice'; reason: EntryQrNoticeReason; message: string };

export type EntryQrNoticeReason =
  'GIFT_PENDING' | 'GIFT_EXPIRED' | 'GIFT_SENT' | 'CANCELED' | 'EVENT_REMOVED' | 'UNAVAILABLE';

export const ENTRY_QR_NOTICE: Record<EntryQrNoticeReason, string> = {
  GIFT_PENDING: '선물 대기 중인 티켓이에요. 선물을 취소하면 입장할 수 있어요',
  GIFT_EXPIRED: '공연이 끝나 선물을 받을 수 없어요. 선물을 회수해 주세요',
  GIFT_SENT: '선물한 티켓이에요. 받은 분의 QR로 입장해요',
  CANCELED: '취소된 티켓이라 입장할 수 없어요',
  EVENT_REMOVED: '공연 정보를 찾을 수 없어 입장 QR을 보여 줄 수 없어요',
  UNAVAILABLE: '입장 QR을 보여 줄 수 없어요',
};

/**
 * T-2(또는 GG-7a) → 입장 QR. `qrValue`가 있으면 QR, null이면 사유 안내(선물 대기·만료·완료, 취소·환불, 삭제된 공연).
 * 입장 완료 티켓도 `qrValue`가 오면 QR을 그린다(다시 찍으면 서버가 `ALREADY_ENTERED`).
 */
export function entryQr(detail: Pick<MyTicketDetail, 'qrValue' | 'state' | 'event'>): EntryQr {
  if (detail.qrValue) return { kind: 'qr', value: detail.qrValue };
  const reason = noticeReason(detail);
  return { kind: 'notice', reason, message: ENTRY_QR_NOTICE[reason] };
}

function noticeReason(detail: Pick<MyTicketDetail, 'state' | 'event'>): EntryQrNoticeReason {
  switch (detail.state) {
    case 'GIFT_PENDING':
      return 'GIFT_PENDING';
    case 'GIFT_EXPIRED':
      return 'GIFT_EXPIRED';
    case 'GIFT_SENT':
      return 'GIFT_SENT';
    case 'CANCELED':
    case 'REFUND_REQUESTED':
    case 'REFUNDED':
      return 'CANCELED';
    default:
      return detail.event === null ? 'EVENT_REMOVED' : 'UNAVAILABLE';
  }
}
