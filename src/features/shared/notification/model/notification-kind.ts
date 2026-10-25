import type {
  Notification,
  NotificationTarget,
  NotificationType,
  ReadNotificationsRequest,
} from '@/api/notification/schema';

/**
 * 알림 타입 → 카테고리·아이콘·이동 경로(plan P9b, patterns §21). 문구는 서버 `title`·`body`를 그대로 쓴다 — 여기서 만들지 않는다.
 *
 * 카테고리는 GUI 알림함(`331:11574`)의 3종이다. 호스트·환불·취소 알림은 가까운 카테고리로 모은다
 * (멤버 추가 → 공연 알림, 주문·환불·취소 → 티켓승인 안내). 공연 리마인더 2종(#810)은 공연 알림(Q13).
 * 모르는 타입은 `OTHER`(기본 아이콘) — `title`·`body`는 그대로 그린다.
 */

export type NotificationCategory = 'GIFT' | 'TICKET' | 'EVENT' | 'OTHER';

/** 아이콘 자리. V가 아이콘 컴포넌트에 잇는다(`alarm-clock`은 아이콘 세트에 아직 없다 — GUI `icon/alarm-clock`) */
export type NotificationIcon = 'gift' | 'ticket' | 'alarm-clock' | 'default';

export const NOTIFICATION_CATEGORIES: Record<
  NotificationCategory,
  { label: string | null; icon: NotificationIcon }
> = {
  GIFT: { label: '티켓선물 안내', icon: 'gift' },
  TICKET: { label: '티켓승인 안내', icon: 'ticket' },
  EVENT: { label: '공연 알림', icon: 'alarm-clock' },
  OTHER: { label: null, icon: 'default' },
};

/**
 * 받는 사람. `host`는 호스트 활성 마스터·매니저가 받는 주문 알림 — 이동은 호스팅 센터 예매자 관리(Q1 기본안).
 * 백엔드 `NotificationType.kt`의 "수신자" 주석 기준.
 */
export type NotificationAudience = 'user' | 'host';

const KINDS: Record<
  NotificationType,
  { category: NotificationCategory; audience: NotificationAudience }
> = {
  HOST_MEMBER_ADDED: { category: 'EVENT', audience: 'user' },
  ORDER_PENDING_APPROVE: { category: 'TICKET', audience: 'host' },
  ORDER_APPROVED: { category: 'TICKET', audience: 'user' },
  ORDER_REFUSED: { category: 'TICKET', audience: 'user' },
  ORDER_REFUND_REQUESTED: { category: 'TICKET', audience: 'host' },
  ORDER_CANCELED_BY_USER: { category: 'TICKET', audience: 'host' },
  ORDER_CANCELED_BY_HOST: { category: 'TICKET', audience: 'user' },
  ORDER_REFUND_COMPLETED: { category: 'TICKET', audience: 'user' },
  REFUND_ACCOUNT_CHANGED: { category: 'TICKET', audience: 'host' },
  GIFT_SENT: { category: 'GIFT', audience: 'user' },
  GIFT_ACCEPTED: { category: 'GIFT', audience: 'user' },
  GIFT_RECEIVED: { category: 'GIFT', audience: 'user' },
  GIFT_REJECTED: { category: 'GIFT', audience: 'user' },
  GIFT_RETURNED: { category: 'GIFT', audience: 'user' },
  GIFT_TICKET_CANCELED: { category: 'GIFT', audience: 'user' },
  EVENT_REMINDER_D1: { category: 'EVENT', audience: 'user' },
  EVENT_STARTING_SOON: { category: 'EVENT', audience: 'user' },
  UNKNOWN: { category: 'OTHER', audience: 'user' },
};

export const notificationCategory = (type: NotificationType): NotificationCategory =>
  KINDS[type].category;

export const notificationAudience = (type: NotificationType): NotificationAudience =>
  KINDS[type].audience;

/** 티켓탭 공지 바(G11/T-3)를 푸는 승인 알림인지 — 읽으면 T-3을 다시 읽는다(api-contract §6 F10) */
export const isApprovalNotification = (type: NotificationType) => type === 'ORDER_APPROVED';

/**
 * 알림을 누르면 갈 곳(Q1 기본안 + #810). 갈 곳을 정할 수 없으면 null(읽음 처리만 한다).
 *
 * | target.type | 이동 |
 * |---|---|
 * | `HOST` | 호스트 홈 `/hosts/{hostId}` |
 * | `ORDER` | 관객이 받은 알림 → 주문상세 `/orders/{orderUuid}`, 호스트가 받은 알림 → 예매자 관리 주문 상세 `/hosting/events/{eventId}/guests?order={orderUuid}` |
 * | `GIFT` | 티켓탭 `/tickets` |
 * | `EVENT` | 공연 상세 `/events/{eventId}` |
 *
 * 모르는 타입의 `ORDER`는 받는 사람을 알 수 없어 null — 호스트가 받은 알림을 관객 주문상세로 보내면 404다.
 * 모르는 `target.type`도 null.
 */
export function notificationHref(n: Pick<Notification, 'type' | 'target'>): string | null {
  const t: NotificationTarget = n.target;
  const id = encodeURIComponent(t.targetId);
  switch (t.type) {
    case 'HOST':
      return t.targetId ? `/hosts/${id}` : null;
    case 'ORDER': {
      if (!t.targetId || n.type === 'UNKNOWN') return null;
      if (notificationAudience(n.type) === 'host') {
        return t.eventId === null ? null : `/hosting/events/${t.eventId}/guests?order=${id}`;
      }
      return `/orders/${id}`;
    }
    case 'GIFT':
      return '/tickets';
    case 'EVENT': {
      const eventId = t.eventId ?? (/^\d+$/.test(t.targetId) ? Number(t.targetId) : null);
      return eventId === null ? null : `/events/${eventId}`;
    }
    case 'UNKNOWN':
      return null;
  }
}

/** 알림함 한 줄에 필요한 값(UI 무관). 문구는 서버 값 그대로 */
export type NotificationView = {
  id: number;
  type: NotificationType;
  category: NotificationCategory;
  /** 카테고리 이름. 모르는 타입은 null */
  categoryLabel: string | null;
  icon: NotificationIcon;
  title: string;
  body: string;
  /** `yyyy.MM.dd HH:mm`(상대 시간 표시는 V) */
  createdAt: string | null;
  isRead: boolean;
  href: string | null;
};

export function toNotificationView(n: Notification): NotificationView {
  const category = notificationCategory(n.type);
  const { label, icon } = NOTIFICATION_CATEGORIES[category];
  return {
    id: n.notificationId,
    type: n.type,
    category,
    categoryLabel: label,
    icon,
    title: n.title,
    body: n.body,
    createdAt: n.createdAt,
    isRead: n.isRead,
    href: notificationHref(n),
  };
}

/** 읽음 대상 — 목록에서 누른 한 건, 또는 [모두 읽음] */
export type ReadTarget = number | 'all';

/** PN-3 본문. 단건은 `{notificationIds: [id]}`(상한 100개 안), 전체는 `{readAll: true}` */
export function readRequestOf(target: ReadTarget): ReadNotificationsRequest {
  return target === 'all' ? { readAll: true } : { notificationIds: [target] };
}
