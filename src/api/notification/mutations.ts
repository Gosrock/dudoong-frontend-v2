import { mutationOptions } from '@tanstack/react-query';

import { api } from '../http';
import { type ReadNotificationsRequest, ReadNotificationsResultSchema } from './schema';

/**
 * PN-3 읽음 처리(멱등 — 이미 읽은 것·남의 것·없는 id는 무시하고 200). `notificationIds`는 100개 이하.
 * 캐시 반영(행 읽음 표시·벨·티켓탭 공지 바)은 화면 훅(`useReadNotifications`)이 한다.
 */
export const readNotificationsMutation = () =>
  mutationOptions({
    mutationFn: (body: ReadNotificationsRequest) =>
      api.post('me/notifications/read', ReadNotificationsResultSchema, body),
  });
