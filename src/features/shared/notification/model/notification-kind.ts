import type {
  Notification,
  NotificationTarget,
  NotificationType,
  ReadNotificationsRequest,
} from '@/api/notification/schema';
import { eventHref, hostHref, orderHref } from '@/features/shared/routes';

/**
 * 알림 타입 → 창(관객 / 호스트)·이름·아이콘·이동 경로(plan P9b, patterns §21). 문구(`body`)는 서버 값 그대로 — 여기서 만들지 않는다.
 *
 * GUI 알림함(2026-11-22 Ready — 관객 `1047:4070` · 호스트 `2025:1471`, #375 · #376)은 한 줄 머리에 **알림 이름**(굵게)을 두고
 * 아래에 본문을 둔다. 이름은 Figma에 있는 것(선물 반송 알림 · 주문 승인 · 공연 알림 · 신규 주문 알림 · 주문 취소 요청 ·
 * 호스트 멤버 추가)은 그대로, 나머지 종류는 같은 말투로 정했다(🤖 Claude 판단 — Figma 코멘트). 서버 `title`은 본문이 비었을 때만 쓴다.
 *
 * 창 구분은 서버 필드가 없어 `type`으로 한다(GN-1에 창 · 정렬 파라미터 없음 — backend-questions B75). 호스트 창은 호스트
 * 활성 마스터 · 매니저가 받는 주문 알림 4종 + 호스트 멤버 추가(GUI 호스트 창 `2025:1509`). 모르는 타입은 관객 창.
 * 아이콘은 GUI대로 관객 창 filled · 호스트 창 outline.
 */

/** 알림함의 창(GUI 탭 "관객" · "호스트") */
export type NotificationTab = 'audience' | 'host';

export const NOTIFICATION_TABS: readonly { key: NotificationTab; label: string }[] = [
  { key: 'audience', label: '관객' },
  { key: 'host', label: '호스트' },
];

/** 아이콘 자리(V가 `ic_*`에 잇는다). 변형(filled · outline)은 창으로 정한다 */
export type NotificationIcon = 'gift' | 'ticket' | 'clock' | 'order-detail' | 'people' | 'default';

/**
 * 받는 사람. `host`는 호스트 활성 마스터·매니저가 받는 주문 알림 — 이동은 호스팅 센터 예매자 관리(Q1 기본안).
 * 백엔드 `NotificationType.kt`의 "수신자" 주석 기준. 멤버 추가(`HOST_MEMBER_ADDED`)는 추가된 사용자 본인이 받고 호스트 홈으로 간다
 * (받는 사람은 `user`지만 창은 호스트 — GUI `2025:1471`)
 */
export type NotificationAudience = 'user' | 'host';

const KINDS: Record<
  NotificationType,
  { label: string; icon: NotificationIcon; audience: NotificationAudience; tab: NotificationTab }
> = {
  HOST_MEMBER_ADDED: { label: '호스트 멤버 추가', icon: 'people', audience: 'user', tab: 'host' },
  ORDER_PENDING_APPROVE: {
    label: '신규 주문 알림',
    icon: 'order-detail',
    audience: 'host',
    tab: 'host',
  },
  ORDER_APPROVED: { label: '주문 승인', icon: 'ticket', audience: 'user', tab: 'audience' },
  ORDER_REFUSED: { label: '주문 거절', icon: 'ticket', audience: 'user', tab: 'audience' },
  ORDER_REFUND_REQUESTED: {
    label: '주문 취소 요청',
    icon: 'order-detail',
    audience: 'host',
    tab: 'host',
  },
  ORDER_CANCELED_BY_USER: {
    label: '주문 취소 알림',
    icon: 'order-detail',
    audience: 'host',
    tab: 'host',
  },
  ORDER_CANCELED_BY_HOST: { label: '주문 취소', icon: 'ticket', audience: 'user', tab: 'audience' },
  ORDER_REFUND_COMPLETED: { label: '환불 완료', icon: 'ticket', audience: 'user', tab: 'audience' },
  REFUND_ACCOUNT_CHANGED: {
    label: '환불 계좌 변경',
    icon: 'order-detail',
    audience: 'host',
    tab: 'host',
  },
  GIFT_SENT: { label: '선물 발송 알림', icon: 'gift', audience: 'user', tab: 'audience' },
  GIFT_ACCEPTED: { label: '선물 수령 알림', icon: 'gift', audience: 'user', tab: 'audience' },
  GIFT_RECEIVED: { label: '선물 도착 알림', icon: 'gift', audience: 'user', tab: 'audience' },
  GIFT_REJECTED: { label: '선물 반송 알림', icon: 'gift', audience: 'user', tab: 'audience' },
  GIFT_RETURNED: { label: '선물 반환 알림', icon: 'gift', audience: 'user', tab: 'audience' },
  GIFT_TICKET_CANCELED: {
    label: '선물 취소 알림',
    icon: 'gift',
    audience: 'user',
    tab: 'audience',
  },
  EVENT_REMINDER_D1: { label: '공연 알림', icon: 'clock', audience: 'user', tab: 'audience' },
  EVENT_STARTING_SOON: { label: '공연 알림', icon: 'clock', audience: 'user', tab: 'audience' },
  UNKNOWN: { label: '알림', icon: 'default', audience: 'user', tab: 'audience' },
};

export const notificationLabel = (type: NotificationType): string => KINDS[type].label;

export const notificationIcon = (type: NotificationType): NotificationIcon => KINDS[type].icon;

export const notificationTab = (type: NotificationType): NotificationTab => KINDS[type].tab;

export const notificationAudience = (type: NotificationType): NotificationAudience =>
  KINDS[type].audience;

/**
 * 티켓탭 공지 바(G11/T-3)를 푸는 알림인지 — 읽으면 T-3을 다시 읽는다(api-contract §6 F10).
 * 승인 알림(`ORDER_APPROVED`)은 승인 띠(`orderUuids`), 거절 알림(`ORDER_REFUSED`)은 거절 띠(`refusedOrderUuids`)를 푼다(#208).
 */
export const affectsTicketNotice = (type: NotificationType) =>
  type === 'ORDER_APPROVED' || type === 'ORDER_REFUSED';

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
      return t.targetId ? hostHref(t.targetId) : null;
    case 'ORDER': {
      if (!t.targetId || n.type === 'UNKNOWN') return null;
      if (notificationAudience(n.type) === 'host') {
        return t.eventId === null ? null : `/hosting/events/${t.eventId}/guests?order=${id}`;
      }
      return orderHref(t.targetId);
    }
    case 'GIFT':
      return '/tickets';
    case 'EVENT': {
      const eventId = t.eventId ?? (/^\d+$/.test(t.targetId) ? Number(t.targetId) : null);
      return eventId === null ? null : eventHref(eventId);
    }
    case 'UNKNOWN':
      return null;
  }
}

/** 알림함 한 줄에 필요한 값(UI 무관). 본문은 서버 값 그대로 */
export type NotificationView = {
  id: number;
  type: NotificationType;
  tab: NotificationTab;
  /** 알림 이름(GUI 행 머리 굵은 글자) */
  label: string;
  icon: NotificationIcon;
  /** 서버 `body`. 비었으면 서버 `title` */
  text: string;
  /** `yyyy.MM.dd HH:mm`(상대 시간 표시는 V) */
  createdAt: string | null;
  isRead: boolean;
  href: string | null;
};

export function toNotificationView(n: Notification): NotificationView {
  return {
    id: n.notificationId,
    type: n.type,
    tab: notificationTab(n.type),
    label: notificationLabel(n.type),
    icon: notificationIcon(n.type),
    text: n.body.trim() ? n.body : n.title,
    createdAt: n.createdAt,
    isRead: n.isRead,
    href: notificationHref(n),
  };
}

const TAB_PARAM = 'tab';

/** 주소 쿼리 → 창. 모르는 값 · 없음은 관객 창 */
export function parseNotificationTab(search: URLSearchParams): NotificationTab {
  return search.get(TAB_PARAM) === 'host' ? 'host' : 'audience';
}

/** 창을 바꾼 주소 쿼리(`?…` 또는 ''). 관객 창(기본)은 주소에 쓰지 않는다. 다른 쿼리는 그대로 */
export function notificationTabSearch(tab: NotificationTab, currentSearch: string): string {
  const params = new URLSearchParams(currentSearch);
  if (tab === 'audience') params.delete(TAB_PARAM);
  else params.set(TAB_PARAM, tab);
  const next = params.toString();
  return next ? `?${next}` : '';
}

/** 읽음 대상 — 목록에서 누른 한 건, 창을 열어 본 안 읽은 알림들(100개 이하), 또는 전체 */
export type ReadTarget = number | readonly number[] | 'all';

/** PN-3 본문. 단건 · 여러 건은 `{notificationIds}`(상한 100개 — 나누기는 훅), 전체는 `{readAll: true}` */
export function readRequestOf(target: ReadTarget): ReadNotificationsRequest {
  if (target === 'all') return { readAll: true };
  return { notificationIds: typeof target === 'number' ? [target] : [...target] };
}

/** 이 대상이 그 알림을 읽음으로 바꾸는지 */
export function readTargetIncludes(target: ReadTarget, id: number): boolean {
  if (target === 'all') return true;
  return typeof target === 'number' ? target === id : target.includes(id);
}

/** PN-3 상한(100)으로 나눈다 */
export function chunkReadIds(ids: readonly number[], max: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < ids.length; i += max) out.push(ids.slice(i, i + max));
  return out;
}
