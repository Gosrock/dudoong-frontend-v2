import type { QueryClient } from '@tanstack/react-query';

import { giftLandingQuery, giftLandingViewerQuery } from '@/api/gift/queries';
import { myTicketQuery, myTicketsQuery } from '@/api/my-ticket/queries';

import type { GiftRefetch } from './gift-errors';

export type GiftRefetchContext = { ticketUuid?: string | null; giftToken?: string | null };

/**
 * 에러 표의 `refetch`를 실행한다. 대상이 없는 항목(랜딩에서 연 회수의 `ticket` 등)은 건너뛴다.
 * - `ticket` — T-2를 지금 다시 받는다(`fetchQuery` — 기존 링크 화면처럼 값이 바로 필요하다)
 * - `tickets` — T-1 무효화(보이는 목록이 다시 온다)
 * - `landing` — GG-3 공개·viewer 무효화
 */
export async function refetchForGift(
  queryClient: QueryClient,
  targets: readonly GiftRefetch[],
  { ticketUuid, giftToken }: GiftRefetchContext,
) {
  const jobs: Promise<unknown>[] = [];
  for (const target of targets) {
    if (target === 'ticket' && ticketUuid) {
      jobs.push(
        queryClient
          .fetchQuery({ ...myTicketQuery(ticketUuid), staleTime: 0 })
          .catch(() => undefined),
      );
    }
    if (target === 'tickets') {
      jobs.push(
        queryClient.invalidateQueries({ queryKey: myTicketsQuery().queryKey, exact: true }),
      );
    }
    if (target === 'landing' && giftToken) {
      jobs.push(
        queryClient.invalidateQueries({ queryKey: giftLandingViewerQuery(giftToken).queryKey }),
        queryClient.invalidateQueries({
          queryKey: giftLandingQuery(giftToken).queryKey,
          exact: true,
        }),
      );
    }
  }
  await Promise.all(jobs);
}
