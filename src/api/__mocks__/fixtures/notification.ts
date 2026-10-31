import type { Notification, NotificationTarget } from '../../notification/schema';
import { markApprovedNotificationRead, NEW_APPROVED_ORDER_UUID, newApproved } from './my-ticket';

/**
 * 알림센터 mock 저장소(GN-1 · GN-2 · PN-3). 로그인한 mock 사용자(`me`, 고스락 마스터)의 알림만 있다.
 * 문구는 백엔드 `V2NotificationDomainService`·`V2GiftNotificationDomainService`·`V2EventReminderDomainService`(dev 432cce4)를 따른다.
 *
 * - 티켓탭 저장소(`fixtures/my-ticket.ts`)와 이어진다: 승인 알림(`ORDER_APPROVED`)을 읽으면 그 주문이 T-3에서 빠지고,
 *   T-2를 열어 서버가 승인 알림을 읽음 처리했으면(T-3에서 빠졌으면) 여기서도 읽음이다
 * - 25건 — 기본 크기 20이면 두 페이지. 모르는 타입(`FUTURE_TYPE`)과 모르는 대상(`FUTURE_TARGET`)이 한 건씩 있다
 * - 테스트는 `resetNotificationStore()`로 처음 상태로 돌린다
 */

/** 모르는 타입도 넣으려고 `type`·`target.type`을 열어 둔다 */
export type MockNotification = Omit<Notification, 'type' | 'target'> & {
  type: string;
  target: Omit<NotificationTarget, 'type'> & { type: string };
};

/** 테스트가 직접 쓰는 id */
export const NOTIFICATION_ID = {
  /** ORDER_APPROVED — 안 읽음, 주문 `mock-order-tickets-a`(T-3 공지 바 대상) */
  approved: 125,
  /** EVENT_STARTING_SOON — 안 읽음, 공연 101 */
  startingSoon: 124,
  /** GIFT_RECEIVED — 안 읽음, 선물 303 */
  giftReceived: 123,
  /** ORDER_PENDING_APPROVE — 안 읽음, 호스트가 받은 주문 알림(공연 101) */
  hostPendingApprove: 122,
  /** HOST_MEMBER_ADDED — 읽음, 호스트 11 */
  memberAdded: 121,
  /** 모르는 타입 — 안 읽음 */
  unknownType: 120,
  /** 모르는 대상 — 읽음 */
  unknownTarget: 119,
} as const;

const EVENT_101 = '고스락 제37회 정기공연';
const EVENT_90 = '고스락 제36회 정기공연';
const EVENT_103 = '직장인 밴드 합동공연 Vol.3';

const order = (orderUuid: string, eventId: number) => ({
  type: 'ORDER',
  targetId: orderUuid,
  eventId,
});

function seed(): MockNotification[] {
  const rows: Omit<MockNotification, 'createdAt'>[] = [
    {
      notificationId: NOTIFICATION_ID.approved,
      type: 'ORDER_APPROVED',
      title: '티켓 주문이 승인되었습니다!',
      body: `'${EVENT_101}' 일반 예매 주문이 승인되어 티켓이 발급되었어요.`,
      target: order(NEW_APPROVED_ORDER_UUID, 101),
      extra: { eventName: EVENT_101, orderNo: 'R1000101' },
      isRead: false,
    },
    {
      notificationId: NOTIFICATION_ID.startingSoon,
      type: 'EVENT_STARTING_SOON',
      title: '1시간 뒤에 시작됩니다!',
      body: `'${EVENT_101}' 공연이 1시간 뒤에 시작됩니다!`,
      target: { type: 'EVENT', targetId: '101', eventId: 101 },
      extra: { eventName: EVENT_101, hostName: '고스락', startAt: '2026.11.21 18:00' },
      isRead: false,
    },
    {
      notificationId: NOTIFICATION_ID.giftReceived,
      type: 'GIFT_RECEIVED',
      title: '선물받은 티켓이 도착했어요',
      body: `김*수 님에게 받은 '${EVENT_101}' 일반 예매 티켓을 수령하였습니다.`,
      target: { type: 'GIFT', targetId: '303', eventId: 101 },
      extra: { eventName: EVENT_101, ticketName: '일반 예매', issuedTicketNo: 'T1000011' },
      isRead: false,
    },
    {
      notificationId: NOTIFICATION_ID.hostPendingApprove,
      type: 'ORDER_PENDING_APPROVE',
      title: '새 주문이 승인을 기다리고 있어요',
      body: `'${EVENT_101}' 일반 예매 주문(R3000101)이 접수되었습니다.`,
      target: order('mock-host-order-1', 101),
      extra: { eventName: EVENT_101, orderNo: 'R3000101' },
      isRead: false,
    },
    {
      notificationId: NOTIFICATION_ID.memberAdded,
      type: 'HOST_MEMBER_ADDED',
      title: '호스트 멤버로 추가되었어요',
      body: "'고스락' 호스트에 매니저(으)로 추가되었습니다.",
      target: { type: 'HOST', targetId: '11', eventId: null },
      extra: { hostName: '고스락', role: 'MANAGER' },
      isRead: true,
    },
    {
      notificationId: NOTIFICATION_ID.unknownType,
      type: 'FUTURE_TYPE',
      title: '새로운 종류의 알림',
      body: '프론트가 아직 모르는 알림이에요.',
      target: { type: 'EVENT', targetId: '101', eventId: 101 },
      extra: {},
      isRead: false,
    },
    {
      notificationId: NOTIFICATION_ID.unknownTarget,
      type: 'ORDER_APPROVED',
      title: '티켓 주문이 승인되었습니다!',
      body: '모르는 대상으로 온 알림이에요.',
      target: { type: 'FUTURE_TARGET', targetId: 'x', eventId: null },
      extra: {},
      isRead: true,
    },
    {
      notificationId: 118,
      type: 'EVENT_REMINDER_D1',
      title: '공연까지 D-1 남았습니다',
      body: `'${EVENT_101}' 공연까지 D-1 남았습니다. 2026.11.21 18:00 시작`,
      target: { type: 'EVENT', targetId: '101', eventId: 101 },
      extra: { eventName: EVENT_101, hostName: '고스락', startAt: '2026.11.21 18:00' },
      isRead: true,
    },
    {
      notificationId: 117,
      type: 'GIFT_SENT',
      title: '티켓을 선물하고 있어요',
      body: `'${EVENT_101}' 일반 예매 티켓을 선물 중입니다.`,
      target: { type: 'GIFT', targetId: '301', eventId: 101 },
      extra: { eventName: EVENT_101, ticketName: '일반 예매', issuedTicketNo: 'T1000002' },
      isRead: true,
    },
    {
      notificationId: 116,
      type: 'GIFT_ACCEPTED',
      title: '선물한 티켓을 받았어요',
      body: `이영희 님이 '${EVENT_101}' 일반 예매 티켓(T1000003)을 수령했습니다.`,
      target: { type: 'GIFT', targetId: '302', eventId: 101 },
      extra: { eventName: EVENT_101, ticketName: '일반 예매', issuedTicketNo: 'T1000003' },
      isRead: true,
    },
    {
      notificationId: 115,
      type: 'GIFT_REJECTED',
      title: '선물이 반송되었어요',
      body: `'${EVENT_101}' 일반 예매 티켓(T1000013) 선물이 반송되었습니다.`,
      target: { type: 'GIFT', targetId: '306', eventId: 101 },
      extra: { eventName: EVENT_101, ticketName: '일반 예매', issuedTicketNo: 'T1000013' },
      isRead: true,
    },
    {
      notificationId: 114,
      type: 'GIFT_RETURNED',
      title: '선물한 티켓이 돌아왔어요',
      body: `이영희 님이 '${EVENT_101}' 일반 예매 티켓(T1000002)을 돌려보냈습니다.`,
      target: { type: 'GIFT', targetId: '309', eventId: 101 },
      extra: { eventName: EVENT_101, ticketName: '일반 예매', issuedTicketNo: 'T1000002' },
      isRead: true,
    },
    {
      notificationId: 113,
      type: 'GIFT_TICKET_CANCELED',
      title: '선물받은 티켓이 취소되었어요',
      body: `선물받은 '${EVENT_101}' 일반 예매 티켓이 취소되었습니다.`,
      target: { type: 'GIFT', targetId: '310', eventId: 101 },
      extra: { eventName: EVENT_101, ticketName: '일반 예매', issuedTicketNo: 'T1000014' },
      isRead: true,
    },
    {
      notificationId: 112,
      type: 'ORDER_REFUSED',
      title: '티켓 주문이 거절되었습니다',
      body: `'${EVENT_103}' 일반 예매 주문이 거절되었어요. 사유: 입금 확인 불가`,
      target: order('mock-order-tickets-c', 103),
      extra: {
        eventName: EVENT_103,
        orderNo: 'R1000103',
        refuseReasonType: 'DEPOSIT_UNCONFIRMED',
        refuseReason: null,
      },
      isRead: true,
    },
    {
      notificationId: 111,
      type: 'ORDER_CANCELED_BY_HOST',
      title: '티켓 주문이 취소되었습니다',
      body: `'${EVENT_90}' 일반 예매 주문이 호스트에 의해 취소되었어요.`,
      target: order('mock-order-tickets-d', 90),
      extra: { eventName: EVENT_90, orderNo: 'R1000090', cancelReason: null },
      isRead: true,
    },
    {
      notificationId: 110,
      type: 'ORDER_REFUND_COMPLETED',
      title: '환불이 완료되었습니다',
      body: "'어쿠스틱 나이트' 무료 선착순 주문(R1000104)의 환불이 완료되었어요.",
      target: order('mock-order-tickets-e', 102),
      extra: { eventName: '어쿠스틱 나이트', orderNo: 'R1000104' },
      isRead: true,
    },
    {
      notificationId: 109,
      type: 'ORDER_REFUND_REQUESTED',
      title: '주문자가 환불을 요청했어요',
      body: `'${EVENT_101}' 일반 예매 주문(R3000102)에 환불 요청이 들어왔습니다. 환불 계좌로 송금한 뒤 환불 완료로 처리해 주세요.`,
      target: order('mock-host-order-2', 101),
      extra: { eventName: EVENT_101, orderNo: 'R3000102' },
      isRead: true,
    },
    {
      notificationId: 108,
      type: 'ORDER_CANCELED_BY_USER',
      title: '주문자가 주문을 취소했어요',
      body: `'${EVENT_101}' 무료 초대 주문(R3000103)이 주문자에 의해 취소되었습니다.`,
      target: order('mock-host-order-3', 101),
      extra: { eventName: EVENT_101, orderNo: 'R3000103' },
      isRead: true,
    },
    {
      notificationId: 107,
      type: 'REFUND_ACCOUNT_CHANGED',
      title: '환불 계좌가 변경되었어요',
      body: `'${EVENT_101}' 일반 예매 주문(R3000102)의 환불 계좌가 변경되었습니다. 송금 전에 주문 상세에서 새 계좌를 확인해 주세요.`,
      target: order('mock-host-order-2', 101),
      extra: { eventName: EVENT_101, orderNo: 'R3000102' },
      isRead: true,
    },
  ];
  // 2페이지가 되도록 오래된 리마인더를 더한다(101 → 100 → …)
  for (let id = 106; id >= 101; id--) {
    rows.push({
      notificationId: id,
      type: 'EVENT_REMINDER_D1',
      title: '공연까지 D-1 남았습니다',
      body: `'${EVENT_90}' 공연까지 D-1 남았습니다. 2026.05.16 18:00 시작`,
      target: { type: 'EVENT', targetId: '90', eventId: 90 },
      extra: { eventName: EVENT_90, hostName: '고스락', startAt: '2026.05.16 18:00' },
      isRead: true,
    });
  }
  // 최신 순(id 내림차순). 시각은 id마다 한 시간씩 앞으로
  return rows
    .sort((a, b) => b.notificationId - a.notificationId)
    .map((r, i) => ({ ...r, createdAt: createdAt(i) }));
}

function createdAt(hoursAgo: number) {
  const base = Date.UTC(2026, 9, 25, 12, 0); // 2026.10.25 21:00 KST
  const d = new Date(base - hoursAgo * 3_600_000 + 9 * 3_600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}.${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

let store = seed();

export function resetNotificationStore() {
  store = seed();
}

/** T-2로 승인 알림이 읽음 처리된 주문(T-3에서 빠진 주문)을 반영한다 — 서버는 같은 테이블을 본다 */
function syncFromTickets() {
  const stillNew = new Set(newApproved().orderUuids);
  for (const n of store) {
    const approval = n.type === 'ORDER_APPROVED' && n.target.type === 'ORDER';
    if (approval && !n.isRead && !stillNew.has(n.target.targetId)) n.isRead = true;
  }
}

/** GN-1 전체(최신 순) */
export function listNotifications(): MockNotification[] {
  syncFromTickets();
  return store.map((n) => ({ ...n }));
}

/** GN-2 */
export function unreadNotificationCount(): number {
  syncFromTickets();
  return store.filter((n) => !n.isRead).length;
}

/** PN-3. 없는 id는 무시. `readAll`이면 ids를 보지 않는다 */
export function readNotifications(ids: number[] | 'all') {
  syncFromTickets();
  let updatedCount = 0;
  for (const n of store) {
    if (n.isRead || (ids !== 'all' && !ids.includes(n.notificationId))) continue;
    n.isRead = true;
    updatedCount += 1;
    if (n.type === 'ORDER_APPROVED' && n.target.type === 'ORDER') {
      markApprovedNotificationRead(n.target.targetId);
    }
  }
  return { updatedCount, unreadCount: store.filter((n) => !n.isRead).length };
}
