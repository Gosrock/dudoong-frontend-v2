import { queryOptions } from '@tanstack/react-query';

import { api } from '../http';
import { TicketOptionsManageSchema } from './schema';

/**
 * G10/O-1 공연 옵션 풀(일반 멤버 이상, 로그인). 붙은 티켓 id·잠김 포함. 키는 GE-3 아래(`['events', id, 'manage', 'options']`) —
 * 마스터 양도 뒤 술어 무효화(`isEventManageQueryKey`)에 함께 걸린다. 호스팅 센터 기본값(브라우저에서만)
 */
export const eventOptionsQuery = (eventId: string | number) =>
  queryOptions({
    queryKey: ['events', String(eventId), 'manage', 'options'],
    queryFn: ({ signal }) =>
      api.get(`events/${encodeURIComponent(eventId)}/options`, TicketOptionsManageSchema, {
        signal,
      }),
  });
