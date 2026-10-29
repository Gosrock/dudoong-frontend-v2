import { TicketListView } from '@/features/hosting/ticket/TicketListView';

/** 티켓 관리(P12 — G10/T-1 · T-4~T-6 · 옵션 O-1~O-5). 조회는 브라우저에서만 — 공연 스코프 레이아웃이 GE-3·접근을 먼저 판정한다 */
export default async function EventTicketsPage({
  params,
}: PageProps<'/hosting/events/[eventId]/tickets'>) {
  const { eventId } = await params;
  return <TicketListView eventId={eventId} />;
}
