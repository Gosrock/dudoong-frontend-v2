import { TicketFormView } from '@/features/hosting/ticket/TicketFormView';

/**
 * 티켓 수정(P12 — P10/T-3). T-1 목록에서 그 티켓을 찾는다 — 숫자가 아닌 id·목록에 없는 티켓은 공용 404(클라이언트 판정이라 상태 코드는 200)
 */
export default async function EditTicketPage({
  params,
}: PageProps<'/hosting/events/[eventId]/tickets/[ticketItemId]'>) {
  const { eventId, ticketItemId } = await params;
  return <TicketFormView eventId={eventId} ticketItemId={ticketItemId} />;
}
