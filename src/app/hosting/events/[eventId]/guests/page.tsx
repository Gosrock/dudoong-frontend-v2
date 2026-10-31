import { GuestsView } from '@/features/hosting/guest/GuestsView';

/**
 * 예매자 관리(P13a — GR-1~GR-6 · GF-1 · PF-2 · GI-1~GI-3). `?tab=orders|tickets|refunds`, 주문 상세는 `?order={orderUuid}`.
 * 조회는 브라우저에서만 — 공연 스코프 레이아웃이 GE-3·접근을 먼저 판정한다
 */
export default async function EventGuestsPage({
  params,
}: PageProps<'/hosting/events/[eventId]/guests'>) {
  const { eventId } = await params;
  return <GuestsView eventId={eventId} />;
}
