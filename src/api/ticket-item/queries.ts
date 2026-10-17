import { queryOptions } from '@tanstack/react-query';

import { api } from '../http';
import { PublicTicketItemsSchema } from './schema';

/**
 * GP-5 판매 중인 티켓(공개). 잔여가 자주 바뀌어 서버에서 프리페치하지 않고 브라우저 `useQuery`로 읽는다(patterns §14).
 * `staleTime`은 기본값 0.
 */
export const eventTicketItemsQuery = (eventId: string | number) =>
  queryOptions({
    queryKey: ['events', String(eventId), 'ticket-items'],
    queryFn: ({ signal }) =>
      api.get(`events/${encodeURIComponent(eventId)}/ticket-items`, PublicTicketItemsSchema, {
        public: true,
        signal,
      }),
  });
