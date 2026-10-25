import { z } from 'zod';

import { openEnum } from '../shared/open-enum';
import { pageSchema } from '../shared/page';

/**
 * 알림센터(GN-1 · GN-2 · PN-3) 스키마. 기준: 백엔드 dev 432cce4
 * `v2/notification/dto/V2NotificationDtos.kt`, `domains/notification/domain/NotificationType.kt`·`NotificationTargetType.kt`.
 * 문구(`title`·`body`)는 서버가 완성해서 준다 — FE는 그대로 그리고 `type`으로 카테고리·아이콘·이동만 정한다(api-contract §10).
 */

/** 알림 17종(api-contract §3). 순서는 백엔드 enum 그대로 */
export const NOTIFICATION_TYPES = [
  'HOST_MEMBER_ADDED',
  'ORDER_PENDING_APPROVE',
  'ORDER_APPROVED',
  'ORDER_REFUSED',
  'ORDER_REFUND_REQUESTED',
  'ORDER_CANCELED_BY_USER',
  'ORDER_CANCELED_BY_HOST',
  'ORDER_REFUND_COMPLETED',
  'REFUND_ACCOUNT_CHANGED',
  'GIFT_SENT',
  'GIFT_ACCEPTED',
  'GIFT_RECEIVED',
  'GIFT_REJECTED',
  'GIFT_RETURNED',
  'GIFT_TICKET_CANCELED',
  'EVENT_REMINDER_D1',
  'EVENT_STARTING_SOON',
] as const;
export const NotificationTypeSchema = openEnum('NotificationType', NOTIFICATION_TYPES);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

/** 알림 이동 대상(`NotificationTargetType`). EVENT는 #810(공연 리마인더) */
export const NOTIFICATION_TARGET_TYPES = ['HOST', 'ORDER', 'GIFT', 'EVENT'] as const;
export const NotificationTargetTypeSchema = openEnum(
  'NotificationTargetType',
  NOTIFICATION_TARGET_TYPES,
);
export type NotificationTargetType = z.infer<typeof NotificationTargetTypeSchema>;

/**
 * `V2NotificationTarget`. `targetId`는 문자열 — HOST = hostId, ORDER = orderUuid, GIFT = giftId, EVENT = eventId.
 * `eventId`는 ORDER · GIFT · EVENT에 함께 온다(HOST는 null).
 */
export const NotificationTargetSchema = z.object({
  type: NotificationTargetTypeSchema,
  targetId: z.string(),
  eventId: z.number().int().nullable(),
});
export type NotificationTarget = z.infer<typeof NotificationTargetSchema>;

/** GN-1 항목(`V2NotificationResponse`) */
export const NotificationSchema = z.object({
  /** PN-3 `notificationIds`에 넣는 값 */
  notificationId: z.number().int(),
  type: NotificationTypeSchema,
  title: z.string(),
  /** 서버 문자열. HTML로 넣지 않는다(patterns §21) */
  body: z.string(),
  target: NotificationTargetSchema,
  /**
   * 종류별 부가 정보(hostName, role, eventName, orderNo, startAt …). 깨진 값이면 서버가 빈 맵으로 준다.
   * 값이 null일 수 있다 — 서버가 `mapOf("cancelReason" to reason)`처럼 null을 그대로 직렬화한다(`V2NotificationDomainService`)
   */
  extra: z.record(z.string(), z.string().nullable()),
  isRead: z.boolean(),
  /** `yyyy.MM.dd HH:mm` */
  createdAt: z.string().nullable(),
});
export type Notification = z.infer<typeof NotificationSchema>;

/** GN-1. Slice라 `totalElements`·`totalPages`가 null — 다음 페이지는 `hasNext`로만 */
export const NotificationPageSchema = pageSchema(NotificationSchema);
export type NotificationPage = z.infer<typeof NotificationPageSchema>;

/** GN-2 `V2UnreadCountResponse` — 벨 빨간 점은 `count > 0` */
export const UnreadCountSchema = z.object({ count: z.number().int() });
export type UnreadCount = z.infer<typeof UnreadCountSchema>;

/** PN-3 `notificationIds` 상한(`@Size(max = 100)`) */
export const READ_IDS_MAX = 100;

/** PN-3 본문. 단건(목록에서 누름)은 `{notificationIds: [id]}`, 전체는 `{readAll: true}`(ids는 무시된다) */
export type ReadNotificationsRequest = { notificationIds: number[] } | { readAll: true };

/** PN-3 응답(`V2ReadNotificationsResponse`). `unreadCount`로 벨을 바로 갱신한다(patterns §21) */
export const ReadNotificationsResultSchema = z.object({
  /** 이번 요청으로 읽음 처리된 건수(이미 읽은 것·남의 것 제외) */
  updatedCount: z.number().int(),
  /** 처리 후 안 읽음 수 */
  unreadCount: z.number().int(),
});
export type ReadNotificationsResult = z.infer<typeof ReadNotificationsResultSchema>;
