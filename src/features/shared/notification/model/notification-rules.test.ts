import { describe, expect, it } from 'vitest';

import type { Notification, NotificationType } from '@/api/notification/schema';
import { NOTIFICATION_TYPES } from '@/api/notification/schema';

import {
  isApprovalNotification,
  NOTIFICATION_CATEGORIES,
  notificationAudience,
  notificationCategory,
  notificationHref,
  readRequestOf,
  toNotificationView,
} from './notification-kind';

describe('알림 17종 → 카테고리·아이콘(plan P9b, Q13 · #106 운영자 type 표)', () => {
  it.each<[NotificationType, string | null, string]>([
    ['HOST_MEMBER_ADDED', '호스트 · 멤버', 'people'],
    ['ORDER_PENDING_APPROVE', '호스트 · 새 주문', 'order-detail'],
    ['ORDER_APPROVED', '티켓승인 안내', 'ticket'],
    ['ORDER_REFUSED', '티켓승인 안내', 'ticket'],
    ['ORDER_REFUND_REQUESTED', '호스트 · 취소·환불 요청', 'order-detail'],
    ['ORDER_CANCELED_BY_USER', '호스트 · 취소·환불 요청', 'order-detail'],
    ['ORDER_CANCELED_BY_HOST', '주문취소·환불 안내', 'ticket'],
    ['ORDER_REFUND_COMPLETED', '주문취소·환불 안내', 'ticket'],
    ['REFUND_ACCOUNT_CHANGED', '호스트 · 취소·환불 요청', 'order-detail'],
    ['GIFT_SENT', '티켓선물 안내', 'gift'],
    ['GIFT_ACCEPTED', '티켓선물 안내', 'gift'],
    ['GIFT_RECEIVED', '티켓선물 안내', 'gift'],
    ['GIFT_REJECTED', '티켓선물 안내', 'gift'],
    ['GIFT_RETURNED', '티켓선물 안내', 'gift'],
    ['GIFT_TICKET_CANCELED', '티켓선물 안내', 'gift'],
    ['EVENT_REMINDER_D1', '공연 알림', 'alarm-clock'],
    ['EVENT_STARTING_SOON', '공연 알림', 'alarm-clock'],
    ['UNKNOWN', null, 'default'],
  ])('%s → %s(%s)', (type, label, icon) => {
    expect(NOTIFICATION_CATEGORIES[notificationCategory(type)]).toEqual({ label, icon });
  });

  it('17종 모두 OTHER가 아닌 카테고리 7종 중 하나로 간다', () => {
    const categories = new Set(NOTIFICATION_TYPES.map(notificationCategory));
    expect([...categories].sort()).toEqual([
      'EVENT',
      'GIFT',
      'HOST_MEMBER',
      'HOST_ORDER',
      'HOST_REFUND',
      'ORDER',
      'TICKET',
    ]);
  });

  it('호스트가 받는 주문 알림은 모두 "호스트 ·" 카테고리다(관객 알림과 한 목록에서 구분)', () => {
    for (const t of NOTIFICATION_TYPES) {
      if (notificationAudience(t) === 'host') {
        expect(NOTIFICATION_CATEGORIES[notificationCategory(t)].label).toMatch(/^호스트 · /);
      }
    }
  });

  it('승인 알림(ORDER_APPROVED)만 티켓탭 공지 바를 푸는 알림이다', () => {
    expect(NOTIFICATION_TYPES.filter(isApprovalNotification)).toEqual(['ORDER_APPROVED']);
    expect(isApprovalNotification('UNKNOWN')).toBe(false);
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
  it('문구는 서버 title·body 그대로, 모르는 타입도 깨지지 않는다', () => {
    const view = toNotificationView({
      notificationId: 9,
      type: 'UNKNOWN',
      title: '<b>새 알림</b>',
      body: '본문',
      target: { type: 'HOST', targetId: '11', eventId: null },
      extra: {},
      isRead: false,
      createdAt: null,
    });
    expect(view).toEqual({
      id: 9,
      type: 'UNKNOWN',
      category: 'OTHER',
      categoryLabel: null,
      icon: 'default',
      title: '<b>새 알림</b>',
      body: '본문',
      createdAt: null,
      isRead: false,
      href: '/hosts/11',
    });
  });

  it.each([
    ['단건', 7, { notificationIds: [7] }],
    ['전체', 'all' as const, { readAll: true }],
  ])('%s 읽음 본문', (_, target, body) => {
    expect(readRequestOf(target)).toEqual(body);
  });
});
