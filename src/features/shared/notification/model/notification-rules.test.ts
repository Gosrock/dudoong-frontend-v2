import { describe, expect, it } from 'vitest';

import type { Notification, NotificationType } from '@/api/notification/schema';
import { NOTIFICATION_TYPES } from '@/api/notification/schema';

import {
  affectsTicketNotice,
  chunkReadIds,
  notificationAudience,
  notificationHref,
  notificationIcon,
  notificationLabel,
  notificationTab,
  notificationTabSearch,
  parseNotificationTab,
  readRequestOf,
  readTargetIncludes,
  toNotificationView,
} from './notification-kind';

describe('알림 17종 → 창 · 이름 · 아이콘(GUI 알림함 #375 관객 `1047:4070` · #376 호스트 `2025:1471`)', () => {
  it.each<[NotificationType, 'audience' | 'host', string, string]>([
    ['HOST_MEMBER_ADDED', 'host', '호스트 멤버 추가', 'people'],
    ['ORDER_PENDING_APPROVE', 'host', '신규 주문 알림', 'order-detail'],
    ['ORDER_APPROVED', 'audience', '주문 승인', 'ticket'],
    ['ORDER_REFUSED', 'audience', '주문 거절', 'ticket'],
    ['ORDER_REFUND_REQUESTED', 'host', '주문 취소 요청', 'order-detail'],
    ['ORDER_CANCELED_BY_USER', 'host', '주문 취소 알림', 'order-detail'],
    ['ORDER_CANCELED_BY_HOST', 'audience', '주문 취소', 'ticket'],
    ['ORDER_REFUND_COMPLETED', 'audience', '환불 완료', 'ticket'],
    ['REFUND_ACCOUNT_CHANGED', 'host', '환불 계좌 변경', 'order-detail'],
    ['GIFT_SENT', 'audience', '선물 발송 알림', 'gift'],
    ['GIFT_ACCEPTED', 'audience', '선물 수령 알림', 'gift'],
    ['GIFT_RECEIVED', 'audience', '선물 도착 알림', 'gift'],
    ['GIFT_REJECTED', 'audience', '선물 반송 알림', 'gift'],
    ['GIFT_RETURNED', 'audience', '선물 반환 알림', 'gift'],
    ['GIFT_TICKET_CANCELED', 'audience', '선물 취소 알림', 'gift'],
    ['EVENT_REMINDER_D1', 'audience', '공연 알림', 'clock'],
    ['EVENT_STARTING_SOON', 'audience', '공연 알림', 'clock'],
    ['UNKNOWN', 'audience', '알림', 'default'],
  ])('%s → %s 창 · %s(%s)', (type, tab, label, icon) => {
    expect(notificationTab(type)).toBe(tab);
    expect(notificationLabel(type)).toBe(label);
    expect(notificationIcon(type)).toBe(icon);
  });

  it('호스트가 받는 주문 알림은 모두 호스트 창이다(멤버 추가도 호스트 창 — 받는 사람은 본인)', () => {
    for (const t of NOTIFICATION_TYPES) {
      if (notificationAudience(t) === 'host') expect(notificationTab(t)).toBe('host');
    }
    expect(notificationAudience('HOST_MEMBER_ADDED')).toBe('user');
    expect(NOTIFICATION_TYPES.filter((t) => notificationTab(t) === 'host')).toHaveLength(5);
  });

  it('승인·거절 알림(ORDER_APPROVED·ORDER_REFUSED)만 티켓탭 공지 바를 푸는 알림이다(#208)', () => {
    expect(NOTIFICATION_TYPES.filter(affectsTicketNotice)).toEqual([
      'ORDER_APPROVED',
      'ORDER_REFUSED',
    ]);
    expect(affectsTicketNotice('UNKNOWN')).toBe(false);
  });
});

describe('창 주소(?tab=)', () => {
  it.each([
    ['', 'audience'],
    ['?tab=host', 'host'],
    ['?tab=audience', 'audience'],
    ['?tab=x', 'audience'],
  ])('%s → %s', (search, tab) => {
    expect(parseNotificationTab(new URLSearchParams(search))).toBe(tab);
  });

  it('관객 창(기본)은 주소에 쓰지 않고, 다른 쿼리는 남긴다', () => {
    expect(notificationTabSearch('host', '')).toBe('?tab=host');
    expect(notificationTabSearch('audience', '?tab=host')).toBe('');
    expect(notificationTabSearch('host', '?a=1')).toBe('?a=1&tab=host');
  });
});

const n = (
  type: Notification['type'],
  target: Notification['target'],
): Pick<Notification, 'type' | 'target'> => ({ type, target });

describe('알림을 누르면 갈 곳 — target.type별(Q1 기본안 + #810)', () => {
  it.each<[string, Pick<Notification, 'type' | 'target'>, string | null]>([
    [
      'HOST → 호스트 홈',
      n('HOST_MEMBER_ADDED', { type: 'HOST', targetId: '11', eventId: null }),
      '/hosts/11',
    ],
    [
      'ORDER(관객이 받은 승인) → 주문상세',
      n('ORDER_APPROVED', { type: 'ORDER', targetId: 'uuid-a', eventId: 101 }),
      '/orders/uuid-a',
    ],
    [
      'ORDER(관객이 받은 환불 완료) → 주문상세',
      n('ORDER_REFUND_COMPLETED', { type: 'ORDER', targetId: 'uuid-e', eventId: 102 }),
      '/orders/uuid-e',
    ],
    [
      'ORDER(호스트가 받은 새 주문) → 예매자 관리 ?order=',
      n('ORDER_PENDING_APPROVE', { type: 'ORDER', targetId: 'uuid-h', eventId: 101 }),
      '/hosting/events/101/guests?order=uuid-h',
    ],
    [
      'ORDER(호스트가 받은 환불 계좌 변경) → 예매자 관리 ?order=',
      n('REFUND_ACCOUNT_CHANGED', { type: 'ORDER', targetId: 'uuid-h', eventId: 101 }),
      '/hosting/events/101/guests?order=uuid-h',
    ],
    [
      'ORDER(호스트가 받은 알림인데 eventId 없음) → 이동 없음',
      n('ORDER_CANCELED_BY_USER', { type: 'ORDER', targetId: 'uuid-h', eventId: null }),
      null,
    ],
    [
      'ORDER(모르는 타입) → 받는 사람을 몰라 이동 없음',
      n('UNKNOWN', { type: 'ORDER', targetId: 'uuid-x', eventId: 1 }),
      null,
    ],
    [
      'GIFT → 티켓탭',
      n('GIFT_RECEIVED', { type: 'GIFT', targetId: '303', eventId: 101 }),
      '/tickets',
    ],
    [
      'EVENT → 공연 상세',
      n('EVENT_STARTING_SOON', { type: 'EVENT', targetId: '101', eventId: 101 }),
      '/events/101',
    ],
    [
      'EVENT(eventId 없음) → targetId로 공연 상세',
      n('EVENT_REMINDER_D1', { type: 'EVENT', targetId: '90', eventId: null }),
      '/events/90',
    ],
    [
      'EVENT(모르는 타입이어도 대상이 공연이면) → 공연 상세',
      n('UNKNOWN', { type: 'EVENT', targetId: '101', eventId: 101 }),
      '/events/101',
    ],
    [
      '모르는 대상 → 이동 없음',
      n('ORDER_APPROVED', { type: 'UNKNOWN', targetId: 'x', eventId: null }),
      null,
    ],
    [
      '경로 값은 인코딩한다',
      n('ORDER_APPROVED', { type: 'ORDER', targetId: 'a/b', eventId: 1 }),
      '/orders/a%2Fb',
    ],
  ])('%s', (_, notification, href) => {
    expect(notificationHref(notification)).toBe(href);
  });
});

describe('행 값·PN-3 본문', () => {
  it('본문은 서버 body 그대로(HTML로 넣지 않는다), 비었으면 title — 모르는 타입도 깨지지 않는다', () => {
    const base = {
      notificationId: 9,
      type: 'UNKNOWN' as const,
      title: '새 알림',
      body: '<b>본문</b>',
      target: { type: 'HOST' as const, targetId: '11', eventId: null },
      extra: {},
      isRead: false,
      createdAt: null,
    };
    expect(toNotificationView(base)).toEqual({
      id: 9,
      type: 'UNKNOWN',
      tab: 'audience',
      label: '알림',
      icon: 'default',
      text: '<b>본문</b>',
      createdAt: null,
      isRead: false,
      href: '/hosts/11',
    });
    expect(toNotificationView({ ...base, body: '  ' }).text).toBe('새 알림');
  });

  it.each([
    ['단건', 7, { notificationIds: [7] }],
    ['여러 건(창에서 본 알림)', [7, 8] as const, { notificationIds: [7, 8] }],
    ['전체', 'all' as const, { readAll: true }],
  ])('%s 읽음 본문', (_, target, body) => {
    expect(readRequestOf(target)).toEqual(body);
  });

  it('읽음 대상에 그 알림이 드는지 · 100개씩 나누기', () => {
    expect(readTargetIncludes(7, 7)).toBe(true);
    expect(readTargetIncludes(7, 8)).toBe(false);
    expect(readTargetIncludes([7, 8], 8)).toBe(true);
    expect(readTargetIncludes('all', 1)).toBe(true);
    expect(chunkReadIds([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunkReadIds([], 100)).toEqual([]);
  });
});
