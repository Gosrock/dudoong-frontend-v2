import { mutationOptions } from '@tanstack/react-query';

import { api } from '../http';
import { type IssuedTicketsParams, normalizeIssuedTicketsParams } from './queries';

/** GI-3 발급 티켓 엑셀(매니저 이상). GI-1과 같은 필터, 전체 행(1만 행 초과 `IssuedTicket_400_7`). 래퍼 없는 xlsx */
export const exportIssuedTicketsMutation = (eventId: string | number) =>
  mutationOptions({
    mutationFn: (params: Omit<IssuedTicketsParams, 'page' | 'size'> = {}) =>
      api.download(`events/${encodeURIComponent(eventId)}/issued-tickets/export`, {
        searchParams: normalizeIssuedTicketsParams(params),
      }),
  });
