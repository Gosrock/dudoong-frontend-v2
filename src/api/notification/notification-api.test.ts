import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resetTicketStore } from '@/api/__mocks__/fixtures/my-ticket';
import { NOTIFICATION_ID, resetNotificationStore } from '@/api/__mocks__/fixtures/notification';
import { installLoggedInFetch } from '@/test/login-fetch';

import { flattenPages } from '../shared/page';
import { readNotificationsMutation } from './mutations';
import { notificationsQuery, unreadNotificationCountQuery } from './queries';
import {
  NOTIFICATION_TARGET_TYPES,
  NOTIFICATION_TYPES,
  NotificationSchema,
  NotificationTargetTypeSchema,
  NotificationTypeSchema,
} from './schema';

/**
 * 스키마 — 백엔드 `V2NotificationDtos.kt`·`NotificationType.kt`·`NotificationTargetType.kt`(dev 432cce4) 기준(plan §0 테스트 2).
 * 알림은 로그인 API라 `pnpm check:contract`(공개 GET) 대상이 아니다.
 */
let restore: () => void;
beforeEach(() => {
  resetTicketStore();
  resetNotificationStore();
  restore = installLoggedInFetch();
});
afterEach(() => restore());

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('알림 타입·대상 enum', () => {
  it('백엔드 알림 17종을 모두 안다(#810 리마인더 2종 포함)', () => {
    expect(NOTIFICATION_TYPES).toHaveLength(17);
    expect(NOTIFICATION_TYPES).toEqual(
      expect.arrayContaining(['EVENT_REMINDER_D1', 'EVENT_STARTING_SOON']),
    );
  });

  it('대상은 HOST · ORDER · GIFT · EVENT 4종', () => {
    expect(NOTIFICATION_TARGET_TYPES).toEqual(['HOST', 'ORDER', 'GIFT', 'EVENT']);
  });

  it.each([
    ['아는 타입은 그대로', NotificationTypeSchema, 'GIFT_RECEIVED', 'GIFT_RECEIVED'],
    ['모르는 타입은 UNKNOWN', NotificationTypeSchema, 'SOMETHING_NEW', 'UNKNOWN'],
    ['아는 대상은 그대로', NotificationTargetTypeSchema, 'EVENT', 'EVENT'],
    ['모르는 대상은 UNKNOWN', NotificationTargetTypeSchema, 'SEAT', 'UNKNOWN'],
  ])('%s', (_, schema, raw, expected) => {
    expect(schema.parse(raw)).toBe(expected);
  });

  it('extra 값이 null이어도(서버가 null 사유를 그대로 직렬화) 읽는다', () => {
    const parsed = NotificationSchema.parse({
      notificationId: 1,
      type: 'ORDER_CANCELED_BY_HOST',
      title: '티켓 주문이 취소되었습니다',
      body: '…',
      target: { type: 'ORDER', targetId: 'uuid', eventId: 3 },
      extra: { eventName: '공연', orderNo: 'R1', cancelReason: null },
      isRead: false,
      createdAt: '2026.10.25 21:00',
    });
    expect(parsed.extra.cancelReason).toBeNull();
  });
});

describe('mock 응답이 조회 정의의 스키마를 통과한다', () => {
  it('GN-1은 Slice라 건수가 null이고 hasNext로 끝까지 읽는다(25건 = 20 + 5)', async () => {
    const qc = client();
    const options = notificationsQuery();
    await qc.fetchInfiniteQuery(options);
    const first = qc.getQueryData(options.queryKey)!;
    expect(first.pages[0]).toMatchObject({ totalElements: null, totalPages: null, hasNext: true });
    await qc.fetchInfiniteQuery({ ...options, pages: 2 });
    const all = flattenPages(qc.getQueryData(options.queryKey), (n) => n.notificationId);
    expect(all).toHaveLength(25);
    expect(all.find((n) => n.notificationId === NOTIFICATION_ID.unknownType)?.type).toBe('UNKNOWN');
    expect(all.find((n) => n.notificationId === NOTIFICATION_ID.unknownTarget)?.target.type).toBe(
      'UNKNOWN',
    );
  });

  it('GN-2 안 읽은 수와 PN-3 응답 {updatedCount, unreadCount}', async () => {
    const qc = client();
    const before = await qc.fetchQuery(unreadNotificationCountQuery());
    expect(before.count).toBe(5);
    const result = await readNotificationsMutation().mutationFn!(
      { notificationIds: [NOTIFICATION_ID.approved] },
      {} as never,
    );
    expect(result).toEqual({ updatedCount: 1, unreadCount: 4 });
    const again = await readNotificationsMutation().mutationFn!(
      { notificationIds: [NOTIFICATION_ID.approved] },
      {} as never,
    );
    expect(again).toEqual({ updatedCount: 0, unreadCount: 4 });
  });
});
