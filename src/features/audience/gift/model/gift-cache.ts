import type { QueryClient } from '@tanstack/react-query';

import { GIFTS_KEY } from '@/api/gift/queries';
import { MY_TICKETS_KEY } from '@/api/my-ticket/queries';
import { NOTIFICATIONS_KEY } from '@/api/notification/queries';

/**
 * 선물 수락·반환·회수·거절 뒤 캐시 정리(tech-decisions §20). 소유권 이전은 낙관적으로 그리지 않는다 — 서버 성공 뒤에만 부른다.
 *
 * - 티켓 쿼리 전부(`['me', 'tickets', …]` — 목록·상세·공지 바·선물 완료 상세): uuid가 바뀐다
 * - 선물 랜딩 전부(`['gifts', …]` — 공개·viewer)
 * - 알림(`['me', 'notifications', …]`) — 선물 알림이 생긴다
 * - 옛 uuid의 T-2는 지운다(다시 읽으면 404라 무효화가 아니라 제거)
 * 키는 api의 상수만 쓴다(`GIFTS_KEY` · `MY_TICKETS_KEY` · `NOTIFICATIONS_KEY` — 코드 패턴 점검 A12)
 */

export async function refreshAfterGiftChange(
  queryClient: QueryClient,
  { staleTicketUuid }: { staleTicketUuid?: string | null } = {},
) {
  if (staleTicketUuid) {
    queryClient.removeQueries({ queryKey: [...MY_TICKETS_KEY, staleTicketUuid], exact: true });
  }
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: [...MY_TICKETS_KEY] }),
    queryClient.invalidateQueries({ queryKey: [...GIFTS_KEY] }),
    queryClient.invalidateQueries({ queryKey: [...NOTIFICATIONS_KEY] }),
  ]);
}
