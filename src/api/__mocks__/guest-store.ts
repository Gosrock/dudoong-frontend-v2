import type { CheckInResponse } from '../check-in/schema';
import type { Dashboard } from '../dashboard/schema';
import type {
  EntranceStats,
  HostGiftState,
  HostIssuedTicket,
  HostIssuedTicketDetail,
} from '../issued-ticket/schema';
import type {
  HostOrderCounts,
  HostOrderDetail,
  HostOrderElement,
  HostRefundAccount,
  MyOrderDetail,
  OrderMethod,
  PaymentChannel,
  RefundElement,
  RefundStatus,
  RefuseReasonType,
} from '../order/schema';
import type { TicketPayType } from '../ticket-item/schema';
import { mockNow, storedEvent } from './event-store';
import { me } from './fixtures/me';
import {
  myTicketEntranceOf,
  myTicketGiftStateOf,
  recordHostApprovedOrder,
  recordHostCanceledOrder,
} from './fixtures/my-ticket';
import { maskEmail, maskName, maskPhone } from './privacy-mask';
import { isUnlimited, saveTicket, storedTicket, ticketsOfEvent } from './ticket-store';

/**
 * 예매자 관리(P13a) mock 저장소 — 호스트 쪽 주문·발급 티켓. GR-1·GR-2·GF-1·GI-1·GI-2·GD-1이 읽고 PR-3~PR-5·PF-2가 바꾼다.
 * 판정은 백엔드 `V2OrderDomainService`·`OrderValidator`·`V2OrderStatus`·`V2OperationMapper`·`V2OrderQuery`·`V2IssuedTicketQuery`
 * (dev cb8d24e — 432cce4 이후 이 API 변경 없음)를 따른다.
 *
 * - 시드: 고스락 37회(101)에 상태가 다른 주문 9건(실패 1건 포함). 다른 공연은 비어 있다
 * - **관객 주문 연결**: O-1(`order.handlers.ts`)이 만든 mock 사용자 주문은 `registerAudienceOrder`로 여기에 들어오고, 호스트가 바꾸면
 *   `onAudienceOrderChange`로 관객 O-3 주문을 고치게 알린다. 승인하면 티켓탭 저장소(`fixtures/my-ticket.ts`)에 티켓을 넣는다 —
 *   상세 → 선택 → 체크아웃 → 주문 → 승인 → 티켓탭이 이어진다. 관객 취소(O-4)·환불 계좌(O-5)는 `syncAudience*`로 받는다
 * - 재고: 승인하면 티켓 저장소(P12) 재고가 줄고, 승인 후 취소하면 돌아온다(GD-1 판매 매수·GP-5 잔여). 시드 주문과 티켓 저장소의
 *   판매 매수는 맞추지 않았다(fixture 101 일반 예매는 58장 판매로 시작)
 * - "지금"은 공연 표시 상태로 본다: `ONGOING`·`PAST`면 시작 후(fixture 기준 — 실제 시각이 아니다)
 * vitest·e2e는 `resetGuestStore()`(`resetHostingStore()`가 함께 부른다)로 되돌린다.
 */

export type MockPerson = {
  userId: number;
  name: string | null;
  phone: string | null;
  email: string | null;
};

export type StoredGuestTicket = {
  ticketUuid: string;
  issuedTicketNo: string;
  owner: MockPerson;
  giftState: HostGiftState;
  issuedAt: string;
  entrance: 'BEFORE' | 'DONE' | 'CANCELED';
  enteredAt: string | null;
  optionAnswers: HostOrderDetail['lines'][number]['optionAnswers'];
};

export type GuestOrderStatus = 'PENDING_APPROVE' | 'APPROVED' | 'REFUSED' | 'CANCELED' | 'FAILED';

export type StoredGuestOrder = {
  seq: number;
  orderUuid: string;
  orderNo: string;
  eventId: number;
  buyer: MockPerson;
  /** 탈퇴한 주문자(승인 `Order_400_14`) */
  buyerWithdrawn: boolean;
  ticketItemId: number;
  ticketName: string;
  payType: TicketPayType;
  quantity: number;
  totalAmount: number;
  orderedAt: string;
  status: GuestOrderStatus;
  refundStatus: Exclude<RefundStatus, 'UNKNOWN'>;
  refuseReasonType: Exclude<RefuseReasonType, 'UNKNOWN'> | null;
  /** 백엔드 `cancel_reason` — 거절이면 종류 문구(기타는 입력값), 취소면 취소 사유 */
  reasonText: string | null;
  paymentChannel: PaymentChannel | null;
  /** 주문 방식(#888 — 승인형 = APPROVAL, PG·선착순 무료 = PAYMENT). v1 주문도 값이 있다 */
  orderMethod: OrderMethod;
  depositorName: string | null;
  approvedAt: string | null;
  withdrawnAt: string | null;
  refundStatusChangedAt: string | null;
  lines: HostOrderDetail['lines'];
  issuedTickets: StoredGuestTicket[];
  refundAccount: HostRefundAccount | null;
  /** mock 사용자가 O-1로 만든 주문(관객 화면과 연결) */
  audience: boolean;
};

/** 거절 종류 문구(`OrderRefuseReasonType.label`) — 기타는 입력값 */
export const REFUSE_REASON_LABELS = {
  DEPOSIT_UNCONFIRMED: '입금 미확인',
  AMOUNT_MISMATCH: '결제 금액 오류',
  SOLD_OUT: '티켓 매진',
  ETC: '기타',
} as const;

// ─── 시드 ────────────────────────────────────────────────────

/** 시드 이벤트·주문 uuid(테스트에서 부른다) */
export const GUEST_EVENT_ID = 101;
export const GUEST_ORDER = {
  pendingTransfer: 'guest-order-101-a',
  pendingToss: 'guest-order-101-b',
  approved: 'guest-order-101-c',
  approvedFree: 'guest-order-101-d',
  refusedDeposit: 'guest-order-101-e',
  refusedEtc: 'guest-order-101-f',
  hostCanceled: 'guest-order-101-g',
  userRefunded: 'guest-order-101-h',
  failed: 'guest-order-101-i',
} as const;

const person = (userId: number, name: string, phone: string, email: string): MockPerson => ({
  userId,
  name,
  phone,
  email,
});
export const GUEST_BUYERS = {
  minsu: person(51, '김민수', '010-2345-6789', 'minsu@example.com'),
  seoyeon: person(52, '이서연', '010-3456-7890', 'seoyeon@example.com'),
  jihoon: person(53, '박지훈', '010-4567-8901', 'jihoon@example.com'),
  yujin: person(54, '최유진', '010-5678-9012', 'yujin@example.com'),
  haneul: person(55, '정하늘', '010-6789-0123', 'haneul@example.com'),
  doyun: person(56, '한도윤', '010-7890-1234', 'doyun@example.com'),
  sehun: person(57, '오세훈', '010-8901-2345', 'sehun@example.com'),
  nari: person(58, '윤나리', '010-9012-3456', 'nari@example.com'),
} as const;

/** mock 사용자(두둥이)의 구매자 정보 — 관객 O-1 주문 */
export const MOCK_USER_BUYER: MockPerson = {
  userId: me.userId,
  name: me.name,
  phone: '010-1111-2222',
  email: me.email,
};

const NO = {
  optionName: '뒤풀이 참석',
  description: '공연 끝나고 근처 식당에서 함께해요',
  answer: '아니요',
  additionalPrice: 0,
};
const YES = { ...NO, answer: '예', additionalPrice: 10000 };
const MEMBER = (answer: string) => ({
  optionName: '응원하는 멤버',
  description: '한 명만 적어 주세요',
  answer,
  additionalPrice: 0,
});

let seq = 0;
let ticketSeq = 0;
let orders = new Map<string, StoredGuestOrder>();

function base(
  orderUuid: string,
  buyer: MockPerson,
  patch: Partial<StoredGuestOrder> & Pick<StoredGuestOrder, 'status'>,
): StoredGuestOrder {
  seq += 1;
  return {
    seq,
    orderUuid,
    orderNo: `R${2_001_000 + seq}`,
    eventId: GUEST_EVENT_ID,
    buyer,
    buyerWithdrawn: false,
    ticketItemId: 501,
    ticketName: '일반 예매',
    payType: 'DUDOONG',
    quantity: 1,
    totalAmount: 15000,
    orderedAt: `2026.10.${String(10 + seq).padStart(2, '0')} 20:00`,
    refundStatus: 'NONE',
    refuseReasonType: null,
    reasonText: null,
    paymentChannel: 'BANK_TRANSFER',
    orderMethod: 'APPROVAL',
    depositorName: buyer.name,
    approvedAt: null,
    withdrawnAt: null,
    refundStatusChangedAt: null,
    lines: [
      {
        ticketItemId: 501,
        ticketName: '일반 예매',
        unitPrice: 15000,
        quantity: 1,
        linePrice: 15000,
        optionAnswers: [NO, MEMBER('보컬')],
      },
    ],
    issuedTickets: [],
    refundAccount: null,
    audience: false,
    ...patch,
  };
}

function tickets(
  o: StoredGuestOrder,
  count: number,
  patch: (i: number) => Partial<StoredGuestTicket> = () => ({}),
): StoredGuestTicket[] {
  return Array.from({ length: count }, (_, i) => {
    ticketSeq += 1;
    return {
      ticketUuid: `${o.orderUuid}-t${i + 1}`,
      issuedTicketNo: `T${2_000_000 + ticketSeq}`,
      owner: o.buyer,
      giftState: 'NONE' as const,
      issuedAt: o.approvedAt ?? o.orderedAt,
      entrance: 'BEFORE' as const,
      enteredAt: null,
      optionAnswers: o.lines[0]?.optionAnswers ?? [],
      ...patch(i),
    };
  });
}

const ACCOUNT_SEHUN: HostRefundAccount = {
  bankName: 'KB국민은행',
  bankCode: '004',
  accountHolder: '오세훈',
  accountNumber: '123456-78-901234',
  updatedAt: '2026.10.20 10:00',
};
const ACCOUNT_NARI: HostRefundAccount = {
  bankName: '신한은행',
  bankCode: '088',
  accountHolder: '윤나리',
  accountNumber: '110-987-654321',
  updatedAt: '2026.10.21 09:30',
};

function seed() {
  seq = 0;
  ticketSeq = 0;
  const b = GUEST_BUYERS;
  const list: StoredGuestOrder[] = [];
  list.push(
    base(GUEST_ORDER.pendingTransfer, b.minsu, {
      status: 'PENDING_APPROVE',
      quantity: 2,
      totalAmount: 30000,
      lines: [
        {
          ticketItemId: 501,
          ticketName: '일반 예매',
          unitPrice: 15000,
          quantity: 2,
          linePrice: 30000,
          optionAnswers: [NO, MEMBER('드럼')],
        },
      ],
    }),
  );
  list.push(
    base(GUEST_ORDER.pendingToss, b.seoyeon, {
      status: 'PENDING_APPROVE',
      totalAmount: 25000,
      paymentChannel: 'TOSS_TRANSFER',
      depositorName: '이서연엄마',
      lines: [
        {
          ticketItemId: 501,
          ticketName: '일반 예매',
          unitPrice: 15000,
          quantity: 1,
          linePrice: 25000,
          optionAnswers: [YES, MEMBER('베이스')],
        },
      ],
    }),
  );
  const approved = base(GUEST_ORDER.approved, b.jihoon, {
    status: 'APPROVED',
    quantity: 2,
    totalAmount: 30000,
    approvedAt: '2026.10.14 12:00',
  });
  approved.issuedTickets = tickets(approved, 2, (i) =>
    i === 0
      ? { entrance: 'DONE', enteredAt: '2026.10.17 18:40' }
      : { owner: b.yujin, giftState: 'ACCEPTED' },
  );
  list.push(approved);
  const free = base(GUEST_ORDER.approvedFree, b.haneul, {
    status: 'APPROVED',
    ticketItemId: 503,
    ticketName: '초대권',
    payType: 'FREE',
    totalAmount: 0,
    paymentChannel: 'FREE',
    orderMethod: 'PAYMENT',
    depositorName: null,
    approvedAt: '2026.10.15 20:00',
    lines: [
      {
        ticketItemId: 503,
        ticketName: '초대권',
        unitPrice: 0,
        quantity: 1,
        linePrice: 0,
        optionAnswers: [],
      },
    ],
  });
  free.issuedTickets = tickets(free, 1);
  list.push(free);
  list.push(
    base(GUEST_ORDER.refusedDeposit, b.doyun, {
      status: 'REFUSED',
      refuseReasonType: 'DEPOSIT_UNCONFIRMED',
      reasonText: REFUSE_REASON_LABELS.DEPOSIT_UNCONFIRMED,
      withdrawnAt: '2026.10.17 10:00',
      refundStatus: 'REQUESTED',
      refundStatusChangedAt: '2026.10.17 10:00',
    }),
  );
  list.push(
    base(GUEST_ORDER.refusedEtc, b.seoyeon, {
      status: 'REFUSED',
      refuseReasonType: 'ETC',
      reasonText: '중복 주문',
      withdrawnAt: '2026.10.18 10:00',
      refundStatus: 'COMPLETED',
      refundStatusChangedAt: '2026.10.19 10:00',
    }),
  );
  const canceled = base(GUEST_ORDER.hostCanceled, b.sehun, {
    status: 'CANCELED',
    reasonText: '공연 일정 변경',
    approvedAt: '2026.10.16 12:00',
    withdrawnAt: '2026.10.19 12:00',
    refundStatus: 'REQUESTED',
    refundStatusChangedAt: '2026.10.19 12:00',
    refundAccount: ACCOUNT_SEHUN,
  });
  canceled.issuedTickets = tickets(canceled, 1, () => ({ entrance: 'CANCELED' }));
  list.push(canceled);
  const refunded = base(GUEST_ORDER.userRefunded, b.nari, {
    status: 'CANCELED',
    approvedAt: '2026.10.16 13:00',
    withdrawnAt: '2026.10.21 09:30',
    refundStatus: 'REQUESTED',
    refundStatusChangedAt: '2026.10.21 09:30',
    refundAccount: ACCOUNT_NARI,
  });
  refunded.issuedTickets = tickets(refunded, 1, () => ({ entrance: 'CANCELED' }));
  list.push(refunded);
  list.push(
    base(GUEST_ORDER.failed, b.minsu, {
      status: 'FAILED',
      ticketItemId: 503,
      ticketName: '초대권',
      payType: 'FREE',
      totalAmount: 0,
      paymentChannel: 'FREE',
      orderMethod: 'PAYMENT',
      depositorName: null,
      lines: [],
    }),
  );
  orders = new Map(list.map((o) => [o.orderUuid, o]));
}
let listener: ((o: StoredGuestOrder) => void) | null = null;
seed();

/** 처음 값으로 되돌린다(관객 O-1로 들어온 주문도 지운다) */
export const resetGuestStore = seed;

export const storedGuestOrder = (orderUuid: string) => orders.get(orderUuid);

/** 이 공연의 주문(최신 순 — 백엔드 `order.id desc`) */
export const guestOrdersOf = (eventId: number) =>
  [...orders.values()].filter((o) => o.eventId === eventId).sort((a, b) => b.seq - a.seq);

/** 시나리오 도우미 — 주문자를 탈퇴한 것으로(승인 `Order_400_14`) */
export function markBuyerWithdrawn(orderUuid: string) {
  const o = orders.get(orderUuid);
  if (o) o.buyerWithdrawn = true;
}

/** 시나리오 도우미 — 저장소 밖에서 상태를 바꾼다(운영자 대리 처리 #828 흉내) */
export function patchGuestOrder(orderUuid: string, patch: Partial<StoredGuestOrder>) {
  const o = orders.get(orderUuid);
  if (o) orders.set(orderUuid, { ...o, ...patch });
}

/** 시나리오 도우미 — 이 공연에 승인 대기 주문을 `count`건 더한다(목록 페이지 시나리오) */
export function addPendingOrders(eventId: number, count: number) {
  for (let i = 0; i < count; i++) {
    const o = base(`guest-order-${eventId}-extra-${i + 1}`, GUEST_BUYERS.minsu, {
      status: 'PENDING_APPROVE',
      eventId,
    });
    orders.set(o.orderUuid, o);
  }
}

// ─── 관객 주문 연결 ───────────────────────────────────────────

/** 호스트 처리로 관객 주문이 바뀌면 부른다(`order.handlers.ts`가 O-3 저장소를 고친다). 하나만 둔다 */
export function onAudienceOrderChange(fn: (o: StoredGuestOrder) => void) {
  listener = fn;
}
const notify = (o: StoredGuestOrder) => {
  if (o.audience) listener?.(o);
};

const statusFromAudience = (o: MyOrderDetail): GuestOrderStatus =>
  o.status === 'APPROVED'
    ? 'APPROVED'
    : o.status === 'REFUSED'
      ? 'REFUSED'
      : o.status === 'CANCELED' || o.status === 'REFUNDED'
        ? 'CANCELED'
        : 'PENDING_APPROVE';

/** O-1로 만든 mock 사용자 주문을 호스트 저장소에 넣는다(실패 주문은 응답이 에러라 오지 않는다) */
export function registerAudienceOrder(o: MyOrderDetail) {
  if (!o.event || o.ticket.ticketItemId === null) return;
  seq += 1;
  const stored: StoredGuestOrder = {
    seq,
    orderUuid: o.orderUuid,
    orderNo: o.orderNo ?? `R${2_001_000 + seq}`,
    eventId: o.event.eventId,
    buyer: MOCK_USER_BUYER,
    buyerWithdrawn: false,
    ticketItemId: o.ticket.ticketItemId,
    ticketName: o.ticket.name ?? '',
    payType: o.ticket.payType === 'UNKNOWN' || !o.ticket.payType ? 'DUDOONG' : o.ticket.payType,
    quantity: o.quantity,
    totalAmount: o.payment?.totalAmount ?? 0,
    orderedAt: o.orderedAt ?? mockNow(),
    status: statusFromAudience(o),
    refundStatus: 'NONE',
    refuseReasonType: null,
    reasonText: null,
    paymentChannel: o.paymentChannel === 'UNKNOWN' ? null : o.paymentChannel,
    orderMethod: o.approvalRequired ? 'APPROVAL' : 'PAYMENT',
    depositorName: o.depositorName,
    approvedAt: o.approvedAt,
    withdrawnAt: null,
    refundStatusChangedAt: null,
    lines: o.lines.map((l) => ({
      ticketItemId: o.ticket.ticketItemId,
      ticketName: o.ticket.name,
      unitPrice: o.ticket.unitPrice,
      quantity: l.quantity,
      linePrice: l.linePrice,
      optionAnswers: l.optionAnswers,
    })),
    issuedTickets: o.issuedTickets.map((t) => ({
      ticketUuid: t.ticketUuid ?? '',
      issuedTicketNo: t.issuedTicketNo ?? '',
      owner: MOCK_USER_BUYER,
      giftState: 'NONE',
      issuedAt: o.approvedAt ?? mockNow(),
      entrance: t.entrance === 'UNKNOWN' ? 'BEFORE' : t.entrance,
      enteredAt: t.enteredAt,
      optionAnswers: t.optionAnswers,
    })),
    refundAccount: null,
    audience: true,
  };
  orders.set(stored.orderUuid, stored);
}

type RawAccount = Omit<HostRefundAccount, 'updatedAt'>;

/** 관객 취소(O-4) — 호스트 분류는 사용자 취소·환불 모두 `CANCELED`(`V2OrderStatus.of` REFUND) */
export function syncAudienceCancel(
  orderUuid: string,
  o: MyOrderDetail,
  account: RawAccount | null,
) {
  const s = orders.get(orderUuid);
  if (!s) return;
  const now = mockNow();
  orders.set(orderUuid, {
    ...s,
    status: 'CANCELED',
    refundStatus: o.refundStatus === 'UNKNOWN' ? 'NONE' : o.refundStatus,
    withdrawnAt: now,
    refundStatusChangedAt: o.refundStatus === 'REQUESTED' ? now : s.refundStatusChangedAt,
    refundAccount: account ? { ...account, updatedAt: now } : s.refundAccount,
    issuedTickets: s.issuedTickets.map((t) => ({ ...t, entrance: 'CANCELED' })),
  });
}

/** 관객 환불 계좌 입력·수정(O-5) */
export function syncAudienceRefundAccount(orderUuid: string, account: RawAccount) {
  const s = orders.get(orderUuid);
  if (s) orders.set(orderUuid, { ...s, refundAccount: { ...account, updatedAt: mockNow() } });
}

// ─── 판정 ────────────────────────────────────────────────────

const isStarted = (eventId: number) => {
  const e = storedEvent(eventId);
  return !e || e.displayStatus === 'ONGOING' || e.displayStatus === 'PAST';
};
const isOpen = (eventId: number) => storedEvent(eventId)?.status === 'OPEN';

/** 지금 입장 상태 — 관객 주문 티켓은 티켓탭 저장소(호스트 스캔 PQ-2·셀프 체크인)를 따른다 */
function entranceOf(o: StoredGuestOrder, t: StoredGuestTicket) {
  if (!o.audience) return { entrance: t.entrance, enteredAt: t.enteredAt };
  return myTicketEntranceOf(t.ticketUuid) ?? { entrance: t.entrance, enteredAt: t.enteredAt };
}

export type ChangeError =
  | 'Order_404_1'
  | 'Order_400_3'
  | 'Order_400_5'
  | 'Order_400_9'
  | 'Order_400_14'
  | 'Order_400_17'
  | 'Event_400_5'
  | 'Event_400_6'
  | 'Ticket_Item_400_1'
  | 'Ticket_Item_400_6';

type Result = { ok: StoredGuestOrder } | { error: ChangeError };

const findEventOrder = (eventId: number, orderUuid: string) => {
  const o = orders.get(orderUuid);
  return o && o.eventId === eventId ? o : undefined;
};

/**
 * PR-3(`OrderApproveService` → `validCanApproveOrder`): 상태 → 공연 OPEN → 시작 전 → 재고 → 1인 제한 → 탈퇴.
 * PG 주문(`Order_400_7`)·옵션 변경(`Order_400_13`)은 mock 주문에 없다
 */
export function approveGuestOrder(eventId: number, orderUuid: string): Result {
  const o = findEventOrder(eventId, orderUuid);
  if (!o) return { error: 'Order_404_1' };
  if (o.status !== 'PENDING_APPROVE') return { error: 'Order_400_3' };
  if (!isOpen(eventId)) return { error: 'Event_400_5' };
  if (isStarted(eventId)) return { error: 'Event_400_6' };
  const item = storedTicket(o.ticketItemId);
  if (item && item.quantity < o.quantity) return { error: 'Ticket_Item_400_1' };
  if (item) {
    const already = guestOrdersOf(eventId)
      .filter((x) => x.buyer.userId === o.buyer.userId && x.ticketItemId === o.ticketItemId)
      .flatMap((x) => x.issuedTickets)
      .filter((t) => t.entrance !== 'CANCELED').length;
    if (already + o.quantity > item.purchaseLimit) return { error: 'Ticket_Item_400_6' };
  }
  if (o.buyerWithdrawn) return { error: 'Order_400_14' };

  const now = mockNow();
  const next: StoredGuestOrder = { ...o, status: 'APPROVED', approvedAt: now };
  const lineAnswers = o.lines.flatMap((l) =>
    Array.from({ length: l.quantity }, () => l.optionAnswers),
  );
  next.issuedTickets = tickets(next, o.quantity, (i) => ({
    issuedAt: now,
    optionAnswers: lineAnswers[i] ?? [],
  }));
  if (o.audience) {
    const optionAmount = (lineAnswers[0] ?? []).reduce((acc, a) => acc + a.additionalPrice, 0);
    const numbers = recordHostApprovedOrder({
      orderUuid: o.orderUuid,
      orderNo: o.orderNo,
      eventId,
      ticketName: o.ticketName,
      unitPrice: o.lines[0]?.unitPrice ?? 0,
      optionAmount,
      ticketUuids: next.issuedTickets.map((t) => t.ticketUuid),
    });
    next.issuedTickets = next.issuedTickets.map((t, i) => ({
      ...t,
      issuedTicketNo: numbers[i] ?? t.issuedTicketNo,
    }));
  }
  if (item) saveTicket({ ...item, quantity: item.quantity - o.quantity });
  orders.set(orderUuid, next);
  notify(next);
  return { ok: next };
}

/** `validCanWithDraw` 앞단(`validAvailableRefundDate` → 상태 → OPEN). 거절·취소 공통 */
function withdrawBlocker(o: StoredGuestOrder, need: GuestOrderStatus): ChangeError | null {
  if (isStarted(o.eventId)) return 'Order_400_9';
  if (o.status !== need) return 'Order_400_5';
  if (!isOpen(o.eventId)) return 'Event_400_5';
  return null;
}

/** PR-4. 사유 검사(`Order_400_18`)는 핸들러가 주문 조회 전에 한다(`refuseReasonText`) */
export function refuseGuestOrder(
  eventId: number,
  orderUuid: string,
  reasonType: Exclude<RefuseReasonType, 'UNKNOWN'>,
  reasonText: string,
): Result {
  const o = findEventOrder(eventId, orderUuid);
  if (!o) return { error: 'Order_404_1' };
  const blocked = withdrawBlocker(o, 'PENDING_APPROVE');
  if (blocked) return { error: blocked };
  const now = mockNow();
  const paid = o.totalAmount > 0;
  const next: StoredGuestOrder = {
    ...o,
    status: 'REFUSED',
    refuseReasonType: reasonType,
    reasonText,
    withdrawnAt: now,
    refundStatus: paid ? 'REQUESTED' : 'NONE',
    refundStatusChangedAt: paid ? now : o.refundStatusChangedAt,
  };
  orders.set(orderUuid, next);
  notify(next);
  return { ok: next };
}

/** PR-5. 발급 티켓 취소·재고 복구, 유료면 환불 요청 */
export function cancelGuestOrder(
  eventId: number,
  orderUuid: string,
  reason: string | null,
): Result {
  const o = findEventOrder(eventId, orderUuid);
  if (!o) return { error: 'Order_404_1' };
  const blocked = withdrawBlocker(o, 'APPROVED');
  if (blocked) return { error: blocked };
  const now = mockNow();
  const paid = o.totalAmount > 0;
  const next: StoredGuestOrder = {
    ...o,
    status: 'CANCELED',
    reasonText: reason,
    withdrawnAt: now,
    refundStatus: paid ? 'REQUESTED' : 'NONE',
    refundStatusChangedAt: paid ? now : o.refundStatusChangedAt,
    issuedTickets: o.issuedTickets.map((t) => ({ ...t, entrance: 'CANCELED' })),
  };
  const item = storedTicket(o.ticketItemId);
  if (item) saveTicket({ ...item, quantity: item.quantity + o.quantity });
  if (o.audience) recordHostCanceledOrder(orderUuid);
  orders.set(orderUuid, next);
  notify(next);
  return { ok: next };
}

/** PF-2. 이미 완료면 그대로 성공(멱등), 요청이 없으면 `Order_400_17` */
export function completeGuestRefund(eventId: number, orderUuid: string): Result {
  const o = findEventOrder(eventId, orderUuid);
  if (!o) return { error: 'Order_404_1' };
  if (o.refundStatus === 'COMPLETED') return { ok: o };
  if (o.refundStatus === 'NONE') return { error: 'Order_400_17' };
  const next: StoredGuestOrder = {
    ...o,
    refundStatus: 'COMPLETED',
    refundStatusChangedAt: mockNow(),
  };
  orders.set(orderUuid, next);
  notify(next);
  return { ok: next };
}

/**
 * PQ-2(호스트 입장 처리)가 이 저장소의 발급 티켓을 판정한다 — 실제 서버는 GI-1 `ticketUuid`가 QR 값과 같아(api-contract §6)
 * 예매자 관리 [수동 입장 처리](#106 §5)가 같은 API를 쓴다. 관객 주문(`audience`)은 티켓탭 저장소가 맡으므로 null(그쪽 판정을 쓴다)
 */
export function hostCheckInGuestTicket(
  eventId: number,
  ticketUuid: string,
): CheckInResponse | null {
  for (const o of orders.values()) {
    if (o.eventId !== eventId || o.audience) continue;
    const t = o.issuedTickets.find((x) => x.ticketUuid === ticketUuid);
    if (!t) continue;
    const result =
      t.entrance === 'CANCELED'
        ? 'CANCELED'
        : t.entrance === 'DONE'
          ? 'ALREADY_ENTERED'
          : t.giftState === 'PENDING'
            ? 'GIFT_PENDING'
            : 'ENTERED';
    if (result === 'ENTERED') {
      t.entrance = 'DONE';
      t.enteredAt = mockNow();
    }
    return {
      result,
      ticket: {
        ticketUuid: t.ticketUuid,
        issuedTicketNo: t.issuedTicketNo,
        ticketName: o.ticketName,
        buyerName: o.buyer.name,
        ownerName: t.owner.name,
        entrance: t.entrance,
        enteredAt: t.enteredAt,
      },
      candidates: [],
    };
  }
  return null;
}

// ─── 응답 모양(`V2OperationMapper`) ──────────────────────────

/** 매니저 이상이면 원본, 일반 멤버면 가린 값(#822) */
export function toOrderElement(o: StoredGuestOrder, showContact: boolean): HostOrderElement {
  return {
    orderUuid: o.orderUuid,
    orderNo: o.orderNo,
    buyerName: o.buyer.name,
    buyerPhone: o.buyer.phone && (showContact ? o.buyer.phone : maskPhone(o.buyer.phone)),
    ticketName: o.ticketName,
    quantity: o.quantity,
    totalAmount: o.totalAmount,
    orderedAt: o.orderedAt,
    status: o.status,
    refundStatus: o.refundStatus,
    refuseReasonType: o.refuseReasonType,
    refuseReason: o.status === 'REFUSED' ? o.reasonText : null,
    cancelReason: o.status === 'CANCELED' ? o.reasonText : null,
    paymentChannel: o.paymentChannel,
    orderMethod: o.orderMethod,
    depositorName: o.depositorName && (showContact ? o.depositorName : maskName(o.depositorName)),
  };
}

export function toOrderDetail(
  o: StoredGuestOrder,
  showContact: boolean,
  showRefundAccount: boolean,
): HostOrderDetail {
  return {
    order: toOrderElement(o, showContact),
    buyerEmail: o.buyer.email && (showContact ? o.buyer.email : maskEmail(o.buyer.email)),
    approvedAt: o.approvedAt,
    withdrawnAt: o.withdrawnAt,
    refundStatusChangedAt: o.refundStatusChangedAt,
    lines: o.lines,
    issuedTickets: o.issuedTickets.map((t) => ({
      ticketUuid: t.ticketUuid,
      issuedTicketNo: t.issuedTicketNo,
      ticketName: o.ticketName,
      ...entranceOf(o, t),
      optionAnswers: t.optionAnswers,
    })),
    refundAccount: showRefundAccount ? o.refundAccount : null,
  };
}

export function toRefundElement(o: StoredGuestOrder, showRefundAccount: boolean): RefundElement {
  return {
    orderUuid: o.orderUuid,
    orderNo: o.orderNo,
    buyerName: o.buyer.name,
    ticketName: o.ticketName,
    totalAmount: o.totalAmount,
    status: o.status,
    refundStatus: o.refundStatus,
    reason: o.reasonText,
    withdrawnAt: o.withdrawnAt,
    refundStatusChangedAt: o.refundStatusChangedAt,
    refundAccount: showRefundAccount ? o.refundAccount : null,
  };
}

/** 검색(`V2OrderSearchType`) — 일반 멤버는 연락처 숫자 완전 일치·입금자명 완전 일치, 이름은 언제나 부분 일치 */
const digits = (v: string) => v.replace(/\D/g, '');

/**
 * 연락처 완전 일치(서버 `ContactSearch.phoneExact`, #822 — fe423ed4): 입력의 숫자만 남겨 국내(`010…`)·국제(`8210…`) 두 형태로,
 * 저장 값에서 `-`·공백·`+`를 뺀 숫자열과 비교한다. `+82 10-1234-5678`과 `010-1234-5678`은 같은 번호다
 */
export function phoneExactMatch(stored: string, keyword: string): boolean {
  const d = digits(keyword);
  if (d === '') return false;
  const national = d.startsWith('82') && d.length >= 11 ? `0${d.slice(2)}` : d;
  const candidates = national.startsWith('0') ? [national, `82${national.slice(1)}`] : [national];
  return candidates.includes(stored.replace(/[- +]/g, ''));
}
export function matchesOrderSearch(
  o: StoredGuestOrder,
  searchType: string,
  keyword: string,
  exact: boolean,
): boolean {
  if (searchType === 'PHONE') {
    const phone = o.buyer.phone ?? '';
    return exact ? phoneExactMatch(phone, keyword) : phone.includes(keyword);
  }
  if (searchType === 'DEPOSITOR_NAME') {
    const name = o.depositorName ?? '';
    return exact ? name === keyword : o.depositorName !== null && name.includes(keyword);
  }
  return (o.buyer.name ?? '').includes(keyword);
}

export function countsOf(list: StoredGuestOrder[]): HostOrderCounts {
  const n = (s: GuestOrderStatus) => list.filter((o) => o.status === s).length;
  return {
    all: list.length,
    pendingApprove: n('PENDING_APPROVE'),
    approved: n('APPROVED'),
    refused: n('REFUSED'),
    canceled: n('CANCELED'),
    failed: n('FAILED'),
  };
}

// ─── 발급 티켓(GI-1·GI-2) ─────────────────────────────────────

export type GuestTicketRow = { order: StoredGuestOrder; ticket: StoredGuestTicket };

/** 이 공연의 발급 티켓(최신 순). `includeCanceled`가 아니면 유효 티켓만 */
export function guestTicketsOf(eventId: number, includeCanceled = false): GuestTicketRow[] {
  return guestOrdersOf(eventId)
    .flatMap((order) => [...order.issuedTickets].reverse().map((ticket) => ({ order, ticket })))
    .filter((r) => includeCanceled || entranceOf(r.order, r.ticket).entrance !== 'CANCELED');
}

export function findGuestTicket(eventId: number, ticketUuid: string): GuestTicketRow | undefined {
  return guestTicketsOf(eventId, true).find((r) => r.ticket.ticketUuid === ticketUuid);
}

export const currentEntrance = (r: GuestTicketRow) => entranceOf(r.order, r.ticket);

/** 검색(`AdminTableSearchType`) — **현재 소유자** 기준. 일반 멤버의 연락처는 완전 일치 */
export function matchesTicketSearch(
  r: GuestTicketRow,
  searchType: string,
  keyword: string,
  exact: boolean,
): boolean {
  if (searchType === 'PHONE') {
    const phone = r.ticket.owner.phone ?? '';
    return exact ? phoneExactMatch(phone, keyword) : phone.includes(keyword);
  }
  return (r.ticket.owner.name ?? '').includes(keyword);
}

export function toIssuedTicket(r: GuestTicketRow): HostIssuedTicket {
  const { order: o, ticket: t } = r;
  return {
    ticketUuid: t.ticketUuid,
    issuedTicketNo: t.issuedTicketNo,
    ticketItemId: o.ticketItemId,
    payType: o.payType,
    ticketName: o.ticketName,
    buyerName: o.buyer.name,
    ownerName: t.owner.name,
    // 관객 주문은 티켓탭 저장소의 선물 상태를 따른다(입장 상태 `entranceOf`와 같은 이음)
    giftState: (o.audience && myTicketGiftStateOf(t.ticketUuid)) || t.giftState,
    orderUuid: o.orderUuid,
    orderNo: o.orderNo,
    issuedAt: t.issuedAt,
    ...entranceOf(o, t),
  };
}

export function toIssuedTicketDetail(
  r: GuestTicketRow,
  showContact: boolean,
): HostIssuedTicketDetail {
  const phone = (p: string | null) => p && (showContact ? p : maskPhone(p));
  return {
    ticket: toIssuedTicket(r),
    buyerPhone: phone(r.order.buyer.phone),
    ownerPhone: phone(r.ticket.owner.phone),
    optionAnswers: r.ticket.optionAnswers,
  };
}

/** 유효 티켓 입장 통계(`V2EntranceStats`) — 발급 0이면 입장률 0 */
export function entranceStatsOf(rows: GuestTicketRow[]): EntranceStats {
  const issuedCount = rows.length;
  const enteredCount = rows.filter((r) => currentEntrance(r).entrance === 'DONE').length;
  return {
    issuedCount,
    enteredCount,
    notEnteredCount: issuedCount - enteredCount,
    entranceRate: issuedCount === 0 ? 0 : Math.round((enteredCount * 1000) / issuedCount) / 10,
  };
}

// ─── GD-1 ────────────────────────────────────────────────────

/** `V2ReadDashboardUseCase` — 건수·판매금액은 이 저장소, 티켓별 판매 매수는 티켓 저장소(P12) 재고 기준 */
export function dashboardOf(eventId: number): Dashboard | null {
  const e = storedEvent(eventId);
  if (!e) return null;
  const list = guestOrdersOf(eventId);
  const counts = countsOf(list);
  const items = ticketsOfEvent(eventId)
    .sort((a, b) => a.ticketItemId - b.ticketItemId)
    .map((t) => ({
      ticketItemId: t.ticketItemId,
      name: t.name,
      payType: t.payType,
      soldCount: t.supplyCount - t.quantity,
      supplyCount: isUnlimited(t) ? null : t.supplyCount,
      pendingApproveCount: list
        .filter((o) => o.status === 'PENDING_APPROVE' && o.ticketItemId === t.ticketItemId)
        .reduce((acc, o) => acc + o.quantity, 0),
    }));
  return {
    orders: {
      pendingApprove: counts.pendingApprove,
      approved: counts.approved,
      refused: counts.refused,
      refundRequested: list.filter((o) => o.refundStatus === 'REQUESTED').length,
    },
    tickets: {
      totalSoldCount: items.reduce((acc, i) => acc + i.soldCount, 0),
      totalSupplyCount: items.some((i) => i.supplyCount === null)
        ? null
        : items.reduce((acc, i) => acc + (i.supplyCount ?? 0), 0),
      items,
    },
    salesAmount: list
      .filter((o) => o.status === 'APPROVED')
      .reduce((acc, o) => acc + o.totalAmount, 0),
    entranceStats: entranceStatsOf(guestTicketsOf(eventId)),
    displayStatus: e.displayStatus,
    dDay: e.displayStatus === 'UPCOMING' ? e.dDay : null,
    openedAt: e.openedAt,
  };
}
