import { http, type HttpHandler } from 'msw';

import {
  listNotifications,
  readNotifications,
  unreadNotificationCount,
} from './fixtures/notification';
import { errors, ok, paginate, readPageParams, requireAuth } from './respond';

/**
 * 알림센터 — GN-1 목록(Slice, 기본 20 · 상한 100), GN-2 안 읽은 수, PN-3 읽음(멱등). 모두 로그인.
 * 상태는 `fixtures/notification.ts` 저장소(승인 알림을 읽으면 티켓탭 T-3에서 빠진다).
 */

const READ_IDS_MAX = 100;

const list = http.get('*/api/v2/me/notifications', ({ request, cookies }) => {
  const denied = requireAuth(request, cookies);
  if (denied) return denied;
  const params = readPageParams(new URL(request.url), 20, 100);
  if (!params) return errors.badRequest(request);
  return ok(paginate(listNotifications(), params.page, params.size, true));
});

const count = http.get('*/api/v2/me/notifications/unread-count', ({ request, cookies }) => {
  return requireAuth(request, cookies) ?? ok({ count: unreadNotificationCount() });
});

const read = http.post('*/api/v2/me/notifications/read', async ({ request, cookies }) => {
  const denied = requireAuth(request, cookies);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as {
    notificationIds?: unknown;
    readAll?: unknown;
  } | null;
  if (body === null || typeof body !== 'object') return errors.badRequest(request);
  if (body.readAll === true) return ok(readNotifications('all'));
  const ids = body.notificationIds ?? [];
  if (!Array.isArray(ids) || ids.length > READ_IDS_MAX || !ids.every(Number.isInteger)) {
    return errors.badRequest(request);
  }
  return ok(readNotifications(ids as number[]));
});

/**
 * 이름 붙인 세트(plan §0).
 * - `default` — 기본 목록에 들어 있는 GN-1 · GN-2 · PN-3(순서: 고정 경로 `unread-count`는 GN-1과 경로가 달라 겹치지 않는다)
 * - `empty` — 알림이 하나도 없음(벨 0)
 * - `listServerError` — GN-1 5xx
 * - `countServerError` — GN-2 5xx
 * - `readServerError` — PN-3 5xx(행 읽음 표시를 되돌린다)
 */
export const notificationHandlers = {
  default: [list, count, read],
  empty: [
    http.get('*/api/v2/me/notifications', ({ request }) => {
      const params = readPageParams(new URL(request.url), 20, 100) ?? { page: 0, size: 20 };
      return ok(paginate([], params.page, params.size, true));
    }),
    http.get('*/api/v2/me/notifications/unread-count', () => ok({ count: 0 })),
    http.post('*/api/v2/me/notifications/read', () => ok({ updatedCount: 0, unreadCount: 0 })),
  ] satisfies HttpHandler[],
  listServerError: [
    http.get('*/api/v2/me/notifications', ({ request }) => errors.serverError(request)),
  ] satisfies HttpHandler[],
  countServerError: [
    http.get('*/api/v2/me/notifications/unread-count', ({ request }) =>
      errors.serverError(request),
    ),
  ] satisfies HttpHandler[],
  readServerError: [
    http.post('*/api/v2/me/notifications/read', ({ request }) => errors.serverError(request)),
  ] satisfies HttpHandler[],
};
