import { queryOptions } from '@tanstack/react-query';

import { api } from '../http';
import { PublicTicketItemsSchema, TicketItemsManageSchema } from './schema';

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

/**
 * G10/T-1 관리용 티켓 목록(일반 멤버 이상, 로그인 — 생성 순). 재고는 공개 여부와 무관하게 오고 판매 상태·잠금 판정 값·붙은 옵션을 담는다.
 * 키는 GE-3 아래(`['events', id, 'manage', 'ticket-items']`) — 마스터 양도 뒤 술어 무효화(`isEventManageQueryKey`)에 함께 걸린다.
 * 공개 GP-5 키(`eventTicketItemsQuery`)와 엔드포인트·모양이 다르다. 호스팅 센터 기본값(브라우저에서만)
 */
export const ticketItemsManageQuery = (eventId: string | number) =>
  queryOptions({
    queryKey: ['events', String(eventId), 'manage', 'ticket-items'],
    queryFn: ({ signal }) =>
      api.get(
        `events/${encodeURIComponent(eventId)}/ticket-items/manage`,
        TicketItemsManageSchema,
        { signal },
      ),
  });
