import { TicketFormView } from '@/features/hosting/ticket/TicketFormView';

/** 새 티켓 만들기(P12 — P10/T-2 · 은행 목록). 조회는 브라우저에서만. 티켓 없음 공연이면 폼이 읽기 전용 안내를 그린다 */
export default async function NewTicketPage({
  params,
}: PageProps<'/hosting/events/[eventId]/tickets/new'>) {
  const { eventId } = await params;
  return <TicketFormView eventId={eventId} />;
}
