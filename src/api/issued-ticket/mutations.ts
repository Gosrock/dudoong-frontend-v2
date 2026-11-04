import { mutationOptions } from '@tanstack/react-query';

import { api } from '../http';
import { type IssuedTicketsParams, normalizeIssuedTicketsParams } from './queries';
import { HostIssuedTicketDetailSchema } from './schema';

/** GI-3 발급 티켓 엑셀(매니저 이상). GI-1과 같은 필터, 전체 행(1만 행 초과 `IssuedTicket_400_7`). 래퍼 없는 xlsx */
export const exportIssuedTicketsMutation = (eventId: string | number) =>
  mutationOptions({
    mutationFn: (params: Omit<IssuedTicketsParams, 'page' | 'size'> = {}) =>
      api.download(`events/${encodeURIComponent(eventId)}/issued-tickets/export`, {
        searchParams: normalizeIssuedTicketsParams(params),
      }),
  });

/**
 * Q-3 입장 취소(매니저 이상, 백엔드 #929 — B37, 2.5.7). 입장 완료 티켓을 입장 전으로 되돌리고 입장 시각을 지운다(다시 입장할 수 있다).
 * 공연 상태는 PQ-2와 같다(OPEN·정산중, 아니면 `Event_400_27`). 입장 전 `IssuedTicket_400_9` · 취소 티켓 `IssuedTicket_400_3` ·
 * 다른 공연·없는 티켓 404 `IssuedTicket_404_1`. 응답은 GI-2 상세(연락처 원본). 운영 2.5.3에는 없다(404)
 */
export const cancelEntranceMutation = (eventId: string | number) =>
  mutationOptions({
    mutationFn: (ticketUuid: string) =>
      api.post(
        `events/${encodeURIComponent(eventId)}/issued-tickets/${encodeURIComponent(ticketUuid)}/entrance/cancel`,
        HostIssuedTicketDetailSchema,
      ),
  });
