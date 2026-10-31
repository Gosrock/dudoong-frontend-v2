import { queryOptions } from '@tanstack/react-query';

import { api } from '../http';
import { DashboardSchema } from './schema';

/**
 * GD-1 등록 후 대시보드. 키는 GE-3 아래(`['events', id, 'manage', 'dashboard']`) — 마스터 양도 뒤 술어 무효화(P10b)에 함께 걸린다.
 * 주문 승인·거절·취소·환불 완료 뒤 다시 읽는다(`features/hosting/guest/model/guest-cache.ts`).
 */
export const eventDashboardQuery = (eventId: string | number) =>
  queryOptions({
    queryKey: ['events', String(eventId), 'manage', 'dashboard'],
    queryFn: ({ signal }) =>
      api.get(`events/${encodeURIComponent(eventId)}/dashboard`, DashboardSchema, { signal }),
  });
