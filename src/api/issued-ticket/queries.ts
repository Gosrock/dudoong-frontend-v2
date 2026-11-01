import { queryOptions } from '@tanstack/react-query';

import { eventManageKey } from '../event/queries';
import { api } from '../http';
import {
  type EntranceFilter,
  HostIssuedTicketDetailSchema,
  HostIssuedTicketListSchema,
  type IssuedTicketSearchType,
} from './schema';

/** 발급 티켓 키 접두 — GE-3 아래(마스터 양도 뒤 술어 무효화에 걸린다) */
export const hostIssuedTicketsKey = (eventId: string | number) =>
  [...eventManageKey(eventId), 'issued-tickets'] as const;

export type IssuedTicketsParams = {
  entrance?: EntranceFilter;
  searchType?: IssuedTicketSearchType;
  keyword?: string;
  page?: number;
  size?: number;
};

/** GI-1·GI-3 쿼리 정규형 — 서버 기본값(ALL·NAME·0)은 빼고 검색어는 trim 후 비면 뺀다 */
export function normalizeIssuedTicketsParams(params: IssuedTicketsParams = {}) {
  const keyword = params.keyword?.trim();
  return {
    ...(params.entrance && params.entrance !== 'ALL' && { entrance: params.entrance }),
    ...(keyword && {
      keyword,
      ...(params.searchType && params.searchType !== 'NAME' && { searchType: params.searchType }),
    }),
    ...(params.page && { page: params.page }),
    ...(params.size !== undefined && { size: params.size }),
  };
}

/** GI-1 발급 티켓 목록(취소 제외, 최신 순) + 입장 상태별 건수. 검색은 현재 소유자 기준 */
export const hostIssuedTicketsQuery = (
  eventId: string | number,
  params: IssuedTicketsParams = {},
) => {
  const p = normalizeIssuedTicketsParams(params);
  return queryOptions({
    queryKey: [...hostIssuedTicketsKey(eventId), 'list', p],
    queryFn: ({ signal }) =>
      api.get(`events/${encodeURIComponent(eventId)}/issued-tickets`, HostIssuedTicketListSchema, {
        searchParams: p,
        signal,
      }),
  });
};

/** GI-2 발급 티켓 상세(취소 티켓 포함). 다른 공연 티켓은 404 `IssuedTicket_404_1` — 닫고 목록 다시 읽기 */
export const hostIssuedTicketQuery = (eventId: string | number, ticketUuid: string) =>
  queryOptions({
    queryKey: [...hostIssuedTicketsKey(eventId), 'detail', ticketUuid],
    queryFn: ({ signal }) =>
      api.get(
        `events/${encodeURIComponent(eventId)}/issued-tickets/${encodeURIComponent(ticketUuid)}`,
        HostIssuedTicketDetailSchema,
        { signal },
      ),
  });
