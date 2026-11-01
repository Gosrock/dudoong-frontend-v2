import type { CheckInResponse, CheckInStats, CheckInTicket } from '../../check-in/schema';
import type { GiftCancelReason, GiftLandingViewer, GiftStatus } from '../../gift/schema';
import type {
  MyTicketDetail,
  MyTicketElement,
  MyTicketGiftState,
  MyTicketGroup,
  MyTicketState,
} from '../../my-ticket/schema';
import type { MyOrderStatus } from '../../order/schema';
import { findPublicEvent, type MockEvent } from './event';
import { me } from './me';

/**
 * 티켓탭·선물·셀프 체크인 mock 저장소(G11/T-1~T-3, PG-1 · DG-2 · PG-8 · GG-3 · PG-4 · PG-5 · PG-6 · GG-7a, PQ-5).
 * 같은 저장소를 읽고 바꾸므로 "보내기 → 랜딩 → 수락 → 티켓탭"이 이어진다. 판정은 백엔드 `V2MyTicketUseCase`·
 * `V2CheckInDomainService`(dev 24aa595)를 따른다.
 *
 * - 사용자는 둘이다: 로그인한 mock 사용자(`me`, 두둥이)와 다른 사람(`other`). 쿠키가 있는 요청은 언제나 `me`다
 * - 공연은 `fixtures/event.ts`의 값 — OPEN = 저장 상태 OPEN, 끝남 = `PAST`, 시작함 = `ONGOING`·`PAST`
 * - 테스트는 `resetTicketStore()`로 처음 상태로 돌린다(e2e는 mock 백엔드가 워커 안에 있어 직접 부른다)
 */

type Who = 'me' | 'other';

type MockOrder = {
  orderUuid: string;
  orderNo: string;
  buyer: Who;
  status: MyOrderStatus;
  refundStatus: 'NONE' | 'REQUESTED' | 'COMPLETED';
  refuseReasonType: 'DEPOSIT_UNCONFIRMED' | null;
  refuseReason: string | null;
  eventId: number;
  ticketName: string;
  /** 티켓 없는 승인 대기·거절 주문의 수량 */
  quantity: number;
  /** 아직 읽지 않은 승인 알림이 있는지(T-3) */
  unreadApproved: boolean;
};

type MockTicket = {
  id: number;
  uuid: string;
  orderUuid: string;
  owner: Who;
  status: 'BEFORE' | 'DONE' | 'CANCELED';
  enteredAt: string | null;
  ticketName: string;
  unitPrice: number;
  optionAmount: number;
};

type MockGift = {
  giftId: number;
  token: string;
  ticketId: number;
  sender: Who;
  receiver: Who | null;
  /** 랜딩에 보이는 가린 닉네임(고정값) */
  senderName: string;
  receiverName: string | null;
  status: GiftStatus;
  cancelReason: GiftCancelReason | null;
  memo: string | null;
  createdAt: string;
  acceptedAt: string | null;
};

/** 선물 랜딩 토큰 */
export const GIFT_TOKEN = {
  /** 내가 보낸 대기 중 선물(익명 AVAILABLE, 나는 OWN_LINK + giftId 301) */
  mine: 'mock-gift-available',
  /** 다른 사람이 보낸 대기 중 선물 — 내가 받을 수 있다(AVAILABLE) */
  forMe: 'mock-gift-for-me',
  /** 내가 받은 선물(ALREADY_ACCEPTED, isReceiver) */
  accepted: 'mock-gift-accepted',
  /** 내가 보내 수락된 선물(선물 완료) */
  sent: 'mock-gift-sent',
  rejected: 'mock-gift-rejected',
  canceled: 'mock-gift-canceled',
  /** 다른 사람이 보낸, 공연이 끝난 대기 선물(EXPIRED) */
  expired: 'mock-gift-expired',
  /** 내가 보낸, 공연이 끝난 대기 선물(EXPIRED + giftId → 회수) */
  expiredMine: 'mock-gift-expired-mine',
} as const;

export const MISSING_GIFT_TOKEN = 'mock-gift-missing';

/** 셀프 체크인 QR 토큰(공연별) */
export const CHECK_IN_TOKEN = {
  /** 101 — 입장 전 내 티켓 2장(내 주문 1 + 받은 티켓 1) → SELECT_TICKET */
  multi: 'mock-checkin-101',
  /** 103 — 입장 전 내 티켓 1장 → 바로 ENTERED */
  single: 'mock-checkin-103',
  /** 104(진행 중) — 내 티켓 없음 → OTHER_EVENT */
  none: 'mock-checkin-104',
  /** 90(지난 공연) → 400 `Event_400_5` */
  ended: 'mock-checkin-90',
} as const;
const CHECK_IN_EVENTS: Record<string, number> = {
  [CHECK_IN_TOKEN.multi]: 101,
  [CHECK_IN_TOKEN.single]: 103,
  [CHECK_IN_TOKEN.none]: 104,
  [CHECK_IN_TOKEN.ended]: 90,
};

/** 주요 uuid(테스트에서 직접 연다) */
export const TICKET_UUID = {
  /** 101 승인 완료 — 선물 가능 */
  approved: 'mock-ticket-a1',
  /** 101 선물 대기(GIFT_PENDING, giftId 301) */
  giftPending: 'mock-ticket-a2',
  /** 101 받은 티켓(RECEIVED, 반환 가능) */
  received: 'mock-ticket-g1',
  /** 101 다른 사람의 티켓(내 것이 아님) */
  othersInSameEvent: 'mock-ticket-g2',
  /** 90 입장 완료 */
  entered: 'mock-ticket-d1',
  /** 90 선물 만료(GIFT_EXPIRED, giftId 305) */
  giftExpired: 'mock-ticket-d2',
  /** 102 환불 요청(취소됨) */
  refundRequested: 'mock-ticket-e1',
  /** 103 승인 완료 — 셀프 체크인 1장 */
  single: 'mock-ticket-i1',
} as const;

/** 선물 완료(SENT) 행의 giftId — GG-7a */
export const SENT_GIFT_ID = 302;
export const PENDING_GIFT_ID = 301;
export const EXPIRED_MINE_GIFT_ID = 305;

/** 처음 상태의 승인 주문 uuid(T-3 공지 바 대상) */
export const NEW_APPROVED_ORDER_UUID = 'mock-order-tickets-a';

// ─── 시드 ────────────────────────────────────────────────────

const OPTION_ANSWERS = [
  { optionName: '뒤풀이 참석', description: null, answer: '예', additionalPrice: 10000 },
];

function seed() {
  const orders: MockOrder[] = [
    order('mock-order-tickets-a', 'R1000101', 'me', 'APPROVED', 101, '일반 예매', 3, true),
    order('mock-order-tickets-b', 'R1000102', 'me', 'PENDING_APPROVE', 102, '무료 선착순', 2),
    {
      ...order('mock-order-tickets-c', 'R1000103', 'me', 'REFUSED', 103, '일반 예매', 1),
      refuseReasonType: 'DEPOSIT_UNCONFIRMED',
      refuseReason: null,
    },
    order('mock-order-tickets-d', 'R1000090', 'me', 'APPROVED', 90, '일반 예매', 2),
    {
      ...order('mock-order-tickets-e', 'R1000104', 'me', 'REFUNDED', 102, '무료 선착순', 1),
      refundStatus: 'REQUESTED',
    },
    order('mock-order-tickets-i', 'R1000105', 'me', 'APPROVED', 103, '일반 예매', 1),
    order('mock-order-other-g', 'R2000101', 'other', 'APPROVED', 101, '일반 예매', 4),
    order('mock-order-other-h', 'R2000090', 'other', 'APPROVED', 90, '무료 초대', 1),
  ];
  const tickets: MockTicket[] = [
    ticket(1, TICKET_UUID.approved, 'mock-order-tickets-a', 'me', 15000, 10000),
    ticket(2, TICKET_UUID.giftPending, 'mock-order-tickets-a', 'me', 15000, 10000),
    ticket(3, 'mock-ticket-a3', 'mock-order-tickets-a', 'other', 15000, 10000),
    {
      ...ticket(4, TICKET_UUID.entered, 'mock-order-tickets-d', 'me', 15000),
      status: 'DONE',
      enteredAt: '2026.05.16 17:42',
    },
    ticket(5, TICKET_UUID.giftExpired, 'mock-order-tickets-d', 'me', 15000),
    {
      ...ticket(6, TICKET_UUID.refundRequested, 'mock-order-tickets-e', 'me', 0),
      status: 'CANCELED',
    },
    ticket(7, TICKET_UUID.single, 'mock-order-tickets-i', 'me', 15000),
    ticket(11, TICKET_UUID.received, 'mock-order-other-g', 'me', 15000),
    ticket(12, TICKET_UUID.othersInSameEvent, 'mock-order-other-g', 'other', 15000),
    ticket(13, 'mock-ticket-g3', 'mock-order-other-g', 'other', 15000),
    ticket(14, 'mock-ticket-g4', 'mock-order-other-g', 'other', 15000),
    ticket(15, 'mock-ticket-h1', 'mock-order-other-h', 'other', 0),
  ];
  const gifts: MockGift[] = [
    gift(PENDING_GIFT_ID, GIFT_TOKEN.mine, 2, 'me', 'PENDING', {
      memo: '동생',
      senderName: '김*수',
    }),
    gift(SENT_GIFT_ID, GIFT_TOKEN.sent, 3, 'me', 'ACCEPTED', {
      receiver: 'other',
      receiverName: '이영희',
      memo: '친구',
      acceptedAt: '2026.10.12 21:03',
    }),
    gift(303, GIFT_TOKEN.accepted, 11, 'other', 'ACCEPTED', {
      receiver: 'me',
      receiverName: me.name,
      acceptedAt: '2026.10.13 09:15',
    }),
    gift(304, GIFT_TOKEN.forMe, 12, 'other', 'PENDING'),
    gift(EXPIRED_MINE_GIFT_ID, GIFT_TOKEN.expiredMine, 5, 'me', 'PENDING', { senderName: '두*이' }),
    gift(306, GIFT_TOKEN.rejected, 13, 'other', 'REJECTED'),
    gift(307, GIFT_TOKEN.canceled, 14, 'other', 'CANCELED', { cancelReason: 'SENDER' }),
    gift(308, GIFT_TOKEN.expired, 15, 'other', 'PENDING', { senderName: '이*' }),
  ];
  // 셀프 체크인 토큰 → 공연. GQ-4(P13b)가 토큰이 없는 공연에 새로 만들어 넣는다
  const checkInTokens = new Map<string, number>(Object.entries(CHECK_IN_EVENTS));
  return { orders, tickets, gifts, checkInTokens, sequence: 0 };
}

function order(
  orderUuid: string,
  orderNo: string,
  buyer: Who,
  status: MyOrderStatus,
  eventId: number,
  ticketName: string,
  quantity: number,
  unreadApproved = false,
): MockOrder {
  return {
    orderUuid,
    orderNo,
    buyer,
    status,
    refundStatus: 'NONE',
    refuseReasonType: null,
    refuseReason: null,
    eventId,
    ticketName,
    quantity,
    unreadApproved,
  };
}

function ticket(
  id: number,
  uuid: string,
  orderUuid: string,
  owner: Who,
  unitPrice: number,
  optionAmount = 0,
): MockTicket {
  return {
    id,
    uuid,
    orderUuid,
    owner,
    status: 'BEFORE',
    enteredAt: null,
    ticketName: unitPrice === 0 ? '무료 초대' : '일반 예매',
    unitPrice,
    optionAmount,
  };
}

function gift(
  giftId: number,
  token: string,
  ticketId: number,
  sender: Who,
  status: GiftStatus,
  patch: Partial<MockGift> = {},
): MockGift {
  return {
    giftId,
    token,
    ticketId,
    sender,
    receiver: null,
    senderName: '김*수',
    receiverName: null,
    status,
    cancelReason: null,
    memo: null,
    createdAt: '2026.10.10 20:00',
    acceptedAt: null,
    ...patch,
  };
}

let store = seed();

/** 저장소를 처음 상태로 */
export function resetTicketStore() {
  store = seed();
}

// ─── 판정 ────────────────────────────────────────────────────

const eventOf = (eventId: number) => findPublicEvent(eventId) ?? null;
const isEnded = (e: MockEvent | null) => e === null || e.displayStatus === 'PAST';
const isStarted = (e: MockEvent) => e.displayStatus === 'ONGOING' || e.displayStatus === 'PAST';
const isOpen = (e: MockEvent | null) => e !== null && e.status === 'OPEN';
const orderOf = (t: MockTicket) => store.orders.find((o) => o.orderUuid === t.orderUuid)!;
const latestGiftOf = (t: MockTicket) =>
  store.gifts.filter((g) => g.ticketId === t.id).sort((a, b) => b.giftId - a.giftId)[0];

const eventSummary = (e: MockEvent | null) =>
  e && {
    eventId: e.eventId,
    name: e.name,
    posterImageUrl: e.posterImageUrl,
    startAt: e.startAt,
    displayStatus: e.displayStatus,
  };

function giftStateOf(t: MockTicket, viewer: Who = 'me'): MyTicketGiftState {
  const g = latestGiftOf(t);
  if (!g) return 'NONE';
  if (g.status === 'PENDING') return t.owner === viewer ? 'PENDING' : 'NONE';
  if (g.status === 'ACCEPTED') {
    if (t.owner === viewer && g.receiver === viewer) return 'RECEIVED';
    if (g.sender === viewer && t.owner !== viewer) return 'SENT';
  }
  return 'NONE';
}

function stateOf(t: MockTicket, giftState: MyTicketGiftState, expired: boolean): MyTicketState {
  const o = orderOf(t);
  if (t.status === 'CANCELED') {
    if (giftState === 'RECEIVED' || o.status !== 'REFUNDED') return 'CANCELED';
    return o.refundStatus === 'COMPLETED' ? 'REFUNDED' : 'REFUND_REQUESTED';
  }
  if (t.status === 'DONE') return 'ENTERED';
  if (giftState === 'SENT') return 'GIFT_SENT';
  if (giftState === 'PENDING') return expired ? 'GIFT_EXPIRED' : 'GIFT_PENDING';
  if (giftState === 'RECEIVED') return 'RECEIVED';
  return 'APPROVED';
}

/** 선물할 수 없는 이유(`giftBlocker`). null이면 선물 가능 */
function giftBlocker(t: MockTicket): 'Gift_400_1' | 'Gift_400_2' | null {
  const e = eventOf(orderOf(t).eventId);
  const g = latestGiftOf(t);
  if (g?.status === 'PENDING') return 'Gift_400_2';
  if (t.owner !== 'me' || orderOf(t).buyer !== 'me') return 'Gift_400_1';
  if (giftStateOf(t) === 'RECEIVED') return 'Gift_400_1';
  if (t.status !== 'BEFORE' || orderOf(t).status !== 'APPROVED') return 'Gift_400_1';
  if (!e || !isOpen(e) || isStarted(e)) return 'Gift_400_1';
  return null;
}

function canReturn(t: MockTicket) {
  const e = eventOf(orderOf(t).eventId);
  return giftStateOf(t) === 'RECEIVED' && t.status === 'BEFORE' && e !== null && !isStarted(e);
}

function element(t: MockTicket): MyTicketElement {
  const e = eventOf(orderOf(t).eventId);
  const giftState = giftStateOf(t);
  const expired = giftState === 'PENDING' && isEnded(e);
  const sent = giftState === 'SENT';
  return {
    ticketUuid: sent ? null : t.uuid,
    issuedTicketNo: `T${1_000_000 + t.id}`,
    ticketName: t.ticketName,
    optionAmount: t.optionAmount,
    state: stateOf(t, giftState, expired),
    entrance: t.status,
    enteredAt: t.enteredAt,
    giftState,
    isGiftExpired: expired,
    isReceived: giftState === 'RECEIVED',
    giftId: giftState === 'NONE' ? null : (latestGiftOf(t)?.giftId ?? null),
  };
}

// ─── T-1 · T-2 · T-3 · GG-7a ─────────────────────────────────

const visible = (t: MockTicket) => t.owner === 'me' || giftStateOf(t) === 'SENT';

export function listMyTickets(): { groups: MyTicketGroup[] } {
  const byOrder = new Map<string, MockTicket[]>();
  for (const t of store.tickets.filter(visible).sort((a, b) => a.id - b.id)) {
    byOrder.set(t.orderUuid, [...(byOrder.get(t.orderUuid) ?? []), t]);
  }
  const groups = [...byOrder].map(([orderUuid, items]) => {
    const o = store.orders.find((x) => x.orderUuid === orderUuid)!;
    const elements = items.map(element);
    const counts: Record<string, number> = {};
    for (const el of elements) counts[el.state] = (counts[el.state] ?? 0) + 1;
    return groupOf(o, elements, counts);
  });
  const waiting = store.orders
    .filter((o) => o.buyer === 'me' && (o.status === 'PENDING_APPROVE' || o.status === 'REFUSED'))
    .filter((o) => !byOrder.has(o.orderUuid))
    .map((o) =>
      groupOf(o, [], { [o.status === 'REFUSED' ? 'REFUSED' : 'PENDING_APPROVE']: o.quantity }),
    );
  return { groups: [...groups, ...waiting].sort(upcomingOrder) };
}

function groupOf(
  o: MockOrder,
  tickets: MyTicketElement[],
  counts: Record<string, number>,
): MyTicketGroup {
  const mine = o.buyer === 'me';
  const refused = o.status === 'REFUSED';
  return {
    groupKey: mine ? o.orderUuid : `ticket:${tickets[0]?.issuedTicketNo ?? o.orderNo}`,
    orderUuid: mine ? o.orderUuid : null,
    orderNo: mine ? o.orderNo : null,
    isMyOrder: mine,
    orderStatus: mine ? o.status : null,
    refuseReasonType: mine && refused ? o.refuseReasonType : null,
    refuseReason: mine && refused ? o.refuseReason : null,
    event: eventSummary(eventOf(o.eventId)),
    ticketName: tickets[0]?.ticketName ?? o.ticketName,
    counts,
    tickets,
  };
}

/** 공연 임박순: 끝나지 않은 공연(시작 임박순) → 지난 공연(최근 순). 같은 공연이면 내 주문이 앞 */
function upcomingOrder(a: MyTicketGroup, b: MyTicketGroup) {
  const ended = (g: MyTicketGroup) => g.event === null || g.event.displayStatus === 'PAST';
  if (ended(a) !== ended(b)) return ended(a) ? 1 : -1;
  const sa = a.event?.startAt ?? '';
  const sb = b.event?.startAt ?? '';
  if (sa !== sb) return ended(a) ? sb.localeCompare(sa) : sa.localeCompare(sb);
  return a.isMyOrder === b.isMyOrder ? a.groupKey.localeCompare(b.groupKey) : a.isMyOrder ? -1 : 1;
}

function detailOf(t: MockTicket): MyTicketDetail {
  const o = orderOf(t);
  const e = eventOf(o.eventId);
  const el = element(t);
  const g = latestGiftOf(t);
  const sent = el.giftState === 'SENT';
  const mineOrder = o.buyer === 'me';
  return {
    ticketUuid: el.ticketUuid,
    issuedTicketNo: el.issuedTicketNo,
    ticketName: t.ticketName,
    unitPrice: t.unitPrice,
    optionAnswers: t.optionAmount > 0 ? OPTION_ANSWERS : [],
    optionAmount: t.optionAmount,
    state: el.state,
    entrance: t.status,
    enteredAt: t.enteredAt,
    giftState: el.giftState,
    isGiftExpired: el.isGiftExpired,
    isReceived: el.isReceived,
    qrValue:
      e !== null && !sent && el.giftState !== 'PENDING' && t.status !== 'CANCELED' ? t.uuid : null,
    event: eventSummary(e),
    orderUuid: mineOrder ? o.orderUuid : null,
    orderNo: mineOrder ? o.orderNo : null,
    gift: g ? giftInfo(g, el.giftState) : null,
    canGift: !sent && e !== null && giftBlocker(t) === null,
    canReturn: canReturn(t),
  };
}

function giftInfo(g: MockGift, giftState: MyTicketGiftState): MyTicketDetail['gift'] {
  const base = {
    giftId: g.giftId,
    status: g.status,
    giftToken: null,
    linkPath: null,
    memo: null,
    receiverName: null,
    senderName: null,
    createdAt: g.createdAt,
    acceptedAt: null,
  };
  if (giftState === 'PENDING') {
    return { ...base, giftToken: g.token, linkPath: `/gifts/${g.token}`, memo: g.memo };
  }
  if (giftState === 'RECEIVED') return { ...base, senderName: '김민수', acceptedAt: g.acceptedAt };
  if (giftState === 'SENT') {
    return { ...base, memo: g.memo, receiverName: g.receiverName, acceptedAt: g.acceptedAt };
  }
  return null;
}

/** T-2. 내가 지금 소유한 티켓만(아니면 null → `IssuedTicket_404_1`). 그 주문의 승인 알림을 읽음 처리한다 */
export function readMyTicket(uuid: string): MyTicketDetail | null {
  const t = store.tickets.find((x) => x.uuid === uuid && x.owner === 'me');
  if (!t) return null;
  markApprovedRead(orderOf(t));
  return detailOf(t);
}

/** GG-7a. 내가 보내 수락된 선물(지금 선물 완료)만(아니면 null → `Gift_404_1`) */
export function readSentGiftTicket(giftId: number): MyTicketDetail | null {
  const g = store.gifts.find((x) => x.giftId === giftId && x.sender === 'me');
  const t = g && store.tickets.find((x) => x.id === g.ticketId);
  if (!g || !t || latestGiftOf(t)?.giftId !== g.giftId || giftStateOf(t) !== 'SENT') return null;
  markApprovedRead(orderOf(t));
  return detailOf(t);
}

function markApprovedRead(o: MockOrder) {
  if (o.buyer === 'me') o.unreadApproved = false;
}

/** PN-3로 그 주문의 승인 알림(`ORDER_APPROVED`)을 읽음 — T-3 공지 바에서 빠진다(P9b-L, `fixtures/notification.ts`) */
export function markApprovedNotificationRead(orderUuid: string) {
  const o = store.orders.find((x) => x.orderUuid === orderUuid);
  if (o) markApprovedRead(o);
}

export function newApproved() {
  const orderUuids = store.orders
    .filter((o) => o.buyer === 'me' && o.unreadApproved && o.status === 'APPROVED')
    .map((o) => o.orderUuid);
  return { hasNew: orderUuids.length > 0, orderUuids };
}

// ─── 선물 ────────────────────────────────────────────────────

type GiftError =
  | 'Gift_404_1'
  | 'Gift_400_1'
  | 'Gift_400_2'
  | 'Gift_400_3'
  | 'Gift_400_4'
  | 'Gift_400_5'
  | 'Gift_400_7'
  | 'Gift_400_8'
  | 'Gift_400_9'
  | 'IssuedTicket_404_1';
type Outcome<T> = { ok: T } | { error: GiftError };

const memoTooLong = (memo: string | null | undefined) => (memo ?? '').trim().length > 50;
const normalizeMemo = (memo: string | null | undefined) => (memo ?? '').trim() || null;
const resultOf = (g: MockGift, ticketUuid: string | null = null, memo = false) => ({
  giftId: g.giftId,
  status: g.status,
  cancelReason: g.cancelReason,
  memo: memo ? g.memo : null,
  ticketUuid,
});

const nextUuid = (t: MockTicket) => `${t.uuid.replace(/-r\d+$/, '')}-r${++store.sequence}`;

/** PG-1 */
export function createGift(uuid: string, memo: string | null | undefined) {
  const t = store.tickets.find((x) => x.uuid === uuid && x.owner === 'me');
  if (!t) return { error: 'IssuedTicket_404_1' } satisfies Outcome<never>;
  if (memoTooLong(memo)) return { error: 'Gift_400_9' } satisfies Outcome<never>;
  const blocker = giftBlocker(t);
  if (blocker) return { error: blocker } satisfies Outcome<never>;
  const giftId = 400 + ++store.sequence;
  const g = gift(giftId, `mock-gift-new-${giftId}`, t.id, 'me', 'PENDING', {
    memo: normalizeMemo(memo),
    senderName: '두*이',
    createdAt: '2026.10.22 12:00',
  });
  store.gifts.push(g);
  return { ok: { giftId, giftToken: g.token, linkPath: `/gifts/${g.token}`, memo: g.memo } };
}

const sentByMe = (giftId: number) =>
  store.gifts.find((x) => x.giftId === giftId && x.sender === 'me');

/** DG-2 */
export function cancelGift(giftId: number): Outcome<ReturnType<typeof resultOf>> {
  const g = sentByMe(giftId);
  if (!g) return { error: 'Gift_404_1' };
  if (g.status !== 'PENDING') return { error: 'Gift_400_3' };
  g.status = 'CANCELED';
  g.cancelReason = 'SENDER';
  return { ok: resultOf(g, null, true) };
}

/** PG-8 */
export function changeGiftMemo(
  giftId: number,
  memo: unknown,
): Outcome<ReturnType<typeof resultOf>> {
  const g = sentByMe(giftId);
  if (!g) return { error: 'Gift_404_1' };
  if (g.status !== 'PENDING') return { error: 'Gift_400_3' };
  if (typeof memo !== 'string' && memo !== null && memo !== undefined)
    return { error: 'Gift_400_9' };
  if (memoTooLong(memo as string | null)) return { error: 'Gift_400_9' };
  g.memo = normalizeMemo(memo as string | null);
  return { ok: resultOf(g, null, true) };
}

/** 수락·거절 공통 검증: 선물 상태 → 만료 → 본인 링크(백엔드 판정 순서) */
function receivable(token: string): Outcome<{ g: MockGift; t: MockTicket }> {
  const g = store.gifts.find((x) => x.token === token);
  if (!g) return { error: 'Gift_404_1' };
  if (g.status !== 'PENDING') return { error: 'Gift_400_3' };
  const t = store.tickets.find((x) => x.id === g.ticketId)!;
  const e = eventOf(orderOf(t).eventId);
  if (!isOpen(e) || isEnded(e)) return { error: 'Gift_400_5' };
  if (g.sender === 'me') return { error: 'Gift_400_4' };
  return { ok: { g, t } };
}

/** PG-4 — 소유자를 나로, uuid를 새 값으로 */
export function acceptGift(token: string): Outcome<ReturnType<typeof resultOf>> {
  const r = receivable(token);
  if ('error' in r) return r;
  const { g, t } = r.ok;
  g.status = 'ACCEPTED';
  g.receiver = 'me';
  g.receiverName = me.name;
  g.acceptedAt = '2026.10.22 12:30';
  t.owner = 'me';
  t.uuid = nextUuid(t);
  return { ok: resultOf(g, t.uuid) };
}

/** PG-5 */
export function rejectGift(token: string): Outcome<ReturnType<typeof resultOf>> {
  const r = receivable(token);
  if ('error' in r) return r;
  r.ok.g.status = 'REJECTED';
  return { ok: resultOf(r.ok.g) };
}

/** PG-6 — 보낸 사람에게 돌려주고 uuid를 새 값으로 */
export function returnGift(uuid: string): Outcome<ReturnType<typeof resultOf>> {
  const t = store.tickets.find((x) => x.uuid === uuid && x.owner === 'me');
  if (!t) return { error: 'IssuedTicket_404_1' };
  if (giftStateOf(t) !== 'RECEIVED') return { error: 'Gift_400_8' };
  if (!canReturn(t)) return { error: 'Gift_400_7' };
  const g = latestGiftOf(t)!;
  g.status = 'RETURNED';
  t.owner = g.sender;
  t.uuid = nextUuid(t);
  return { ok: resultOf(g, t.uuid) };
}

/** GG-3. `viewer`가 null이면 익명 */
export function giftLanding(token: string, viewer: Who | null): GiftLandingViewer | null {
  const g = store.gifts.find((x) => x.token === token);
  if (!g) return null;
  const t = store.tickets.find((x) => x.id === g.ticketId)!;
  const e = eventOf(orderOf(t).eventId);
  const pending = g.status === 'PENDING';
  const viewState: GiftLandingViewer['viewState'] =
    g.status === 'ACCEPTED'
      ? 'ALREADY_ACCEPTED'
      : g.status !== 'PENDING'
        ? g.status
        : !isOpen(e) || isEnded(e)
          ? 'EXPIRED'
          : viewer !== null && g.sender === viewer
            ? 'OWN_LINK'
            : 'AVAILABLE';
  return {
    status: g.status,
    viewState,
    isLoggedIn: viewer !== null,
    isReceiver: g.status === 'ACCEPTED' && viewer !== null && g.receiver === viewer,
    giftId: viewer !== null && g.sender === viewer ? g.giftId : null,
    senderName: pending ? g.senderName : null,
    event: pending && e ? { ...eventSummary(e)!, placeName: e.place?.name ?? null } : null,
    ticket: pending ? { ticketName: t.ticketName, unitPrice: t.unitPrice } : null,
  };
}

// ─── 셀프 체크인 PQ-5 ─────────────────────────────────────────

const checkInTicket = (t: MockTicket): CheckInTicket => ({
  ticketUuid: t.uuid,
  issuedTicketNo: `T${1_000_000 + t.id}`,
  ticketName: t.ticketName,
  buyerName: orderOf(t).buyer === 'me' ? me.name : '김민수',
  ownerName: t.owner === 'me' ? me.name : '김민수',
  entrance: t.status,
  enteredAt: t.enteredAt,
});

const CHECK_IN_AT = '2026.10.22 18:40';

function enter(t: MockTicket): CheckInResponse {
  const g = latestGiftOf(t);
  const result =
    t.status === 'CANCELED'
      ? 'CANCELED'
      : t.status === 'DONE'
        ? 'ALREADY_ENTERED'
        : g?.status === 'PENDING'
          ? 'GIFT_PENDING'
          : 'ENTERED';
  if (result === 'ENTERED') {
    t.status = 'DONE';
    t.enteredAt = CHECK_IN_AT;
  }
  return { result, ticket: checkInTicket(t), candidates: [] };
}

/** PQ-5. 400 코드는 `{ error }` */
export function selfCheckIn(
  token: string,
  ticketUuid: string | undefined,
): { ok: CheckInResponse } | { error: 'Event_400_26' | 'Event_400_5' | 'IssuedTicket_400_1' } {
  const eventId = store.checkInTokens.get(token);
  if (eventId === undefined) return { error: 'Event_400_26' };
  if (!isOpen(eventOf(eventId))) return { error: 'Event_400_5' };
  const inEvent = (t: MockTicket) => orderOf(t).eventId === eventId;
  const otherEvent: CheckInResponse = { result: 'OTHER_EVENT', ticket: null, candidates: [] };
  if (ticketUuid !== undefined) {
    const t = store.tickets.find((x) => x.uuid === ticketUuid);
    if (!t || !inEvent(t)) return { ok: otherEvent };
    if (t.owner !== 'me') return { error: 'IssuedTicket_400_1' };
    return { ok: enter(t) };
  }
  const mine = store.tickets
    .filter((t) => t.owner === 'me' && inEvent(t))
    .sort((a, b) => a.id - b.id);
  const notEntered = mine.filter((t) => t.status === 'BEFORE');
  const before = notEntered.filter((t) => latestGiftOf(t)?.status !== 'PENDING');
  if (before.length === 1) return { ok: enter(before[0]!) };
  if (before.length > 1) {
    return { ok: { result: 'SELECT_TICKET', ticket: null, candidates: before.map(checkInTicket) } };
  }
  if (notEntered.length > 0) {
    return {
      ok: { result: 'GIFT_PENDING', ticket: checkInTicket(notEntered[0]!), candidates: [] },
    };
  }
  const entered = mine.find((t) => t.status === 'DONE');
  if (entered)
    return { ok: { result: 'ALREADY_ENTERED', ticket: checkInTicket(entered), candidates: [] } };
  if (mine.length > 0) {
    return { ok: { result: 'CANCELED', ticket: checkInTicket(mine.at(-1)!), candidates: [] } };
  }
  return { ok: otherEvent };
}

// ─── 호스트 체크인 PQ-2 · GQ-1 · GQ-4(P13b) ──────────────────

/**
 * PQ-2 판정(`V2CheckInDomainService.checkIn` → `enter`). 공연 상태(`Event_400_27`)·권한은 핸들러가 먼저 본다.
 * 없는 uuid·다른 공연 티켓은 둘 다 OTHER_EVENT(티켓 정보 없음), 그 밖은 취소 → 이미 입장 → 선물 대기 → 입장 순(`classify`)
 */
export function hostCheckIn(eventId: number, ticketUuid: string): CheckInResponse {
  const t = store.tickets.find((x) => x.uuid === ticketUuid);
  if (!t || orderOf(t).eventId !== eventId) {
    return { result: 'OTHER_EVENT', ticket: null, candidates: [] };
  }
  return enter(t);
}

/** GQ-1(`V2IssuedTicketQuery.stats`) — 발급 = 입장 전 + 입장 완료(취소 제외), 입장률은 소수 첫째 자리 반올림, 발급 0이면 0 */
export function checkInStatsOf(eventId: number): CheckInStats {
  const valid = store.tickets.filter(
    (t) => orderOf(t).eventId === eventId && t.status !== 'CANCELED',
  );
  const issuedCount = valid.length;
  const enteredCount = valid.filter((t) => t.status === 'DONE').length;
  return {
    issuedCount,
    enteredCount,
    notEnteredCount: issuedCount - enteredCount,
    entranceRate: issuedCount === 0 ? 0 : Math.round((enteredCount * 1000) / issuedCount) / 10,
  };
}

/** GQ-4 공연별 고정 토큰(`getOrCreateCheckInToken`) — 있으면 그 값, 없으면 만들어 PQ-5가 받게 한다 */
export function checkInTokenOf(eventId: number): string {
  for (const [token, id] of store.checkInTokens) if (id === eventId) return token;
  const token = `mock-checkin-${eventId}`;
  store.checkInTokens.set(token, eventId);
  return token;
}

/** 시나리오 도우미 — 이 티켓을 취소 상태로(호스트가 승인 후 취소한 티켓, PQ-2 `CANCELED`) */
export function markTicketCanceled(ticketUuid: string) {
  const t = store.tickets.find((x) => x.uuid === ticketUuid);
  if (t) t.status = 'CANCELED';
}

// ─── 호스트 승인·취소 연결(P13a) ──────────────────────────────

/** 호스트가 승인한 mock 사용자 주문의 티켓 id 시작값(시드 id와 겹치지 않게) */
const HOST_ISSUED_TICKET_ID_START = 9001;

/**
 * 호스트 승인(PR-3, `guest-store.ts`)이 mock 사용자(`me`)의 O-1 주문을 발급으로 바꿀 때 티켓탭 저장소에 주문·티켓을 넣는다 —
 * "체크아웃 → 주문 → 호스트 승인 → 티켓탭에 발급"이 이어진다(plan P13a 크리티컬 패스). 승인 알림은 읽지 않은 것으로(T-3 공지 바).
 * 돌려주는 값은 티켓 번호(`T…`, T-1·T-2와 같은 값) — 호스트 화면(GR-2·GI-1)도 같은 번호를 쓴다
 */
export function recordHostApprovedOrder(input: {
  orderUuid: string;
  orderNo: string;
  eventId: number;
  ticketName: string;
  unitPrice: number;
  optionAmount: number;
  ticketUuids: string[];
}): string[] {
  store.orders = store.orders.filter((o) => o.orderUuid !== input.orderUuid);
  store.orders.push({
    ...order(
      input.orderUuid,
      input.orderNo,
      'me',
      'APPROVED',
      input.eventId,
      input.ticketName,
      input.ticketUuids.length,
      true,
    ),
  });
  const start = Math.max(HOST_ISSUED_TICKET_ID_START - 1, ...store.tickets.map((t) => t.id)) + 1;
  return input.ticketUuids.map((uuid, i) => {
    const t: MockTicket = {
      id: start + i,
      uuid,
      orderUuid: input.orderUuid,
      owner: 'me',
      status: 'BEFORE',
      enteredAt: null,
      ticketName: input.ticketName,
      unitPrice: input.unitPrice,
      optionAmount: input.optionAmount,
    };
    store.tickets.push(t);
    return `T${1_000_000 + t.id}`;
  });
}

/** 호스트 승인 후 취소(PR-5) — 그 주문의 티켓을 취소로(티켓탭에서 취소 상태) */
export function recordHostCanceledOrder(orderUuid: string) {
  const o = store.orders.find((x) => x.orderUuid === orderUuid);
  if (o) o.status = 'CANCELED';
  for (const t of store.tickets) if (t.orderUuid === orderUuid) t.status = 'CANCELED';
}

/** 티켓탭 저장소의 입장 상태(호스트 스캔 PQ-2·셀프 체크인이 바꾼다) — 호스트 발급 티켓 목록(GI-1)이 읽는다. 없으면 null */
export function myTicketEntranceOf(
  ticketUuid: string,
): { entrance: MockTicket['status']; enteredAt: string | null } | null {
  const t = store.tickets.find((x) => x.uuid === ticketUuid);
  return t ? { entrance: t.status, enteredAt: t.enteredAt } : null;
}

/**
 * 관객 주문 티켓의 지금 선물 상태(호스트 GI-1 `giftState` — P14 회귀 통합 시나리오에서 이음). 선물 링크를 보낸 뒤 수락 전이면
 * `PENDING`. 수락하면 uuid가 바뀌어(PG-4) 이 uuid로는 찾지 못하므로 null — 호스트 쪽 저장값을 그대로 쓴다.
 */
export function myTicketGiftStateOf(ticketUuid: string): 'PENDING' | null {
  const t = store.tickets.find((x) => x.uuid === ticketUuid);
  return t && latestGiftOf(t)?.status === 'PENDING' ? 'PENDING' : null;
}
