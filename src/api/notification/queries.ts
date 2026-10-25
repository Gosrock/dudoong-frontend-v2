import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { api } from '../http';
import { pageInfinite, type PageParams } from '../shared/page';
import { NotificationPageSchema, UnreadCountSchema } from './schema';

/**
 * 알림센터(로그인). 키는 모두 `['me', 'notifications', …]` 아래다 — 선물·티켓 변경이 이 접두로 무효화를 건다
 * (`features/audience/gift/model/gift-cache.ts`·`useTicketDetail`, patterns §21).
 * 알림은 커밋 후 비동기로 저장된다 — 변경 직후 이 쿼리를 다시 읽어도 새 알림이 없을 수 있다.
 */

/** 전부 무효화할 때 쓰는 접두 키 */
export const NOTIFICATIONS_KEY = ['me', 'notifications'] as const;

/** GN-2 안 읽은 수(벨). 세션이 있을 때만 `enabled`. 포커스 재조회가 실패해도 토스트를 띄우지 않는다(빨간 점만 그대로) */
export const unreadNotificationCountQuery = () =>
  queryOptions({
    queryKey: [...NOTIFICATIONS_KEY, 'unread-count'],
    meta: { silent: true },
    queryFn: ({ signal }) =>
      api.get('me/notifications/unread-count', UnreadCountSchema, { signal }),
  });

/** 무한 목록 키의 접두(크기와 상관없이 모든 알림함 캐시) */
export const NOTIFICATIONS_INFINITE_KEY = [...NOTIFICATIONS_KEY, 'infinite'] as const;

/** GN-1 알림함(최신 순, Slice). 브라우저 `useInfiniteQuery`로만 읽는다(patterns §12). 크기 기본 20, 상한 100 */
export const notificationsQuery = (params: PageParams = {}) =>
  infiniteQueryOptions({
    ...pageInfinite,
    queryKey: [...NOTIFICATIONS_INFINITE_KEY, { size: params.size }],
    queryFn: ({ pageParam, signal }) => {
      const searchParams = new URLSearchParams({ page: String(pageParam) });
      if (params.size !== undefined) searchParams.set('size', String(params.size));
      return api.get('me/notifications', NotificationPageSchema, { searchParams, signal });
    },
  });
