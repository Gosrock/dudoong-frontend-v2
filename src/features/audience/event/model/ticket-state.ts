import type { EventDisplayStatus } from '@/api/event/schema';
import { maxOrderQuantity } from '@/api/order/price';
import type { PublicTicketItem } from '@/api/ticket-item/schema';

/**
 * 티켓 표시 판정(plan P6, patterns §15). 화면 모양은 V에서 정하고 여기서는 상태 이름만 정한다.
 *
 * - 구매 가능 여부는 서버 `isPurchasable`로만 판단한다(기존 PG 티켓은 목록에 남고 `false`).
 * - `remaining`은 재고 공개 + 수량 지정일 때만 값이 있다. `null`을 0으로 보이지 않는다.
 * - 지난 공연(GP-3 `displayStatus = PAST`)이면 티켓 값과 상관없이 지난 공연으로 본다.
 * - 결제 방식이 v2에서 주문할 수 없는 것(PRICE · UNKNOWN · null)이면 서버가 `true`를 줘도 판매 불가로 본다 —
 *   체크아웃이 결제 방식을 정할 수 없다(`Order_400_20`).
 */
export type TicketState =
  /** 살 수 있다 */
  | 'PURCHASABLE'
  /** 매진(승인 대기 차감 재고 ≤ 0) */
  | 'SOLD_OUT'
  /** 판매 불가(판매 기간 밖·PG 티켓·공연 시작 후 등 — 서버 판정) */
  | 'NOT_ON_SALE'
  /** 지난 공연 */
  | 'EVENT_ENDED';

/** 체크아웃이 주문을 만들 수 있는 결제 방식 */
const ORDERABLE_PAY_TYPES = new Set(['DUDOONG', 'FREE']);

export type TicketView = {
  ticket: PublicTicketItem;
  state: TicketState;
  /** 수량 상한 = min(purchaseLimit, remaining, 100). 살 수 없으면 0 */
  maxQuantity: number;
  /** 화면에 보일 잔여. 서버가 숨긴 값(`null`)은 그대로 `null` */
  remaining: number | null;
};

export function ticketState(
  ticket: PublicTicketItem,
  eventDisplayStatus: EventDisplayStatus | null | undefined,
): TicketState {
  if (eventDisplayStatus === 'PAST') return 'EVENT_ENDED';
  if (ticket.isSoldOut) return 'SOLD_OUT';
  if (!ticket.isPurchasable) return 'NOT_ON_SALE';
  if (!ticket.payType || !ORDERABLE_PAY_TYPES.has(ticket.payType)) return 'NOT_ON_SALE';
  // 서버 값이 어긋나(구매 가능인데 잔여 0) 상한이 0이면 매진으로 본다
  if (maxOrderQuantity(ticket) === 0) return 'SOLD_OUT';
  return 'PURCHASABLE';
}

export function toTicketView(
  ticket: PublicTicketItem,
  eventDisplayStatus: EventDisplayStatus | null | undefined,
): TicketView {
  const state = ticketState(ticket, eventDisplayStatus);
  return {
    ticket,
    state,
    maxQuantity: state === 'PURCHASABLE' ? maxOrderQuantity(ticket) : 0,
    remaining: ticket.remaining,
  };
}

/**
 * 티켓 목록 전체의 상태 — [티켓 구매하기] 버튼과 빈 상태 문구를 정한다.
 * `UNKNOWN`·`PREPARING` 공연은 티켓 값만 본다(공개 API에 준비중 공연은 오지 않는다).
 */
export type TicketListState =
  /** 하나라도 살 수 있다 */
  | 'AVAILABLE'
  /** 지난 공연 */
  | 'EVENT_ENDED'
  /** 판매 중인 티켓이 없다(서버가 판매 중단·기간 밖·삭제 티켓을 이미 뺀다) */
  | 'NO_TICKETS'
  /** 모두 매진 */
  | 'ALL_SOLD_OUT'
  /** 매진은 아니지만 살 수 있는 티켓이 없다(매진 + 판매 불가 섞임 포함) */
  | 'NOT_ON_SALE';

export function ticketListState(
  tickets: readonly PublicTicketItem[],
  eventDisplayStatus: EventDisplayStatus | null | undefined,
): TicketListState {
  if (eventDisplayStatus === 'PAST') return 'EVENT_ENDED';
  if (tickets.length === 0) return 'NO_TICKETS';
  const states = tickets.map((t) => ticketState(t, eventDisplayStatus));
  if (states.includes('PURCHASABLE')) return 'AVAILABLE';
  if (states.every((s) => s === 'SOLD_OUT')) return 'ALL_SOLD_OUT';
  return 'NOT_ON_SALE';
}
