import { queryOptions } from '@tanstack/react-query';

import { api } from '../http';
import { MyTicketDetailSchema, MyTicketsSchema, NewApprovedSchema } from './schema';

/**
 * 티켓탭(로그인). 키는 모두 `['me', 'tickets', …]` 아래라 선물 수락·반환 뒤 `['me', 'tickets']` 하나로 전부 무효화한다
 * (uuid가 바뀐다 — tech-decisions §20).
 */

/** 전부 무효화할 때 쓰는 접두 키 */
export const MY_TICKETS_KEY = ['me', 'tickets'] as const;

/** G11/T-1 내 티켓(묶음 목록, 페이지 없음). 정렬은 서버 기본(공연 임박순) 하나라 파라미터를 보내지 않는다 */
export const myTicketsQuery = () =>
  queryOptions({
    queryKey: [...MY_TICKETS_KEY],
    queryFn: ({ signal }) => api.get('me/tickets', MyTicketsSchema, { signal }),
  });

/** G11/T-3 공지 바. T-2를 열거나 승인 알림을 읽으면 풀린다 */
export const newApprovedTicketsQuery = () =>
  queryOptions({
    queryKey: [...MY_TICKETS_KEY, 'new-approved'],
    queryFn: ({ signal }) => api.get('me/tickets/new-approved', NewApprovedSchema, { signal }),
  });

/**
 * G11/T-2 티켓 상세 + 입장 QR. **카드를 눌러 상세를 열 때만** 부른다 — 서버가 이 조회로 그 주문의 승인 알림을 읽음 처리해서,
 * 목록에서 미리 읽으면 티켓탭 진입만으로 공지 바가 풀린다(plan P8). 옛 uuid면 404 `IssuedTicket_404_1`.
 */
export const myTicketQuery = (ticketUuid: string) =>
  queryOptions({
    queryKey: [...MY_TICKETS_KEY, ticketUuid],
    queryFn: ({ signal }) =>
      api.get(`me/tickets/${encodeURIComponent(ticketUuid)}`, MyTicketDetailSchema, { signal }),
  });
