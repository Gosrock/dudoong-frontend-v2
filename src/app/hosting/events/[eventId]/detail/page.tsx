import { EventDetailView } from '@/features/hosting/event/EventDetailView';

/** 공연 상세 정보(P11 — GE-5 · PE-6 섹션 전체 교체 · PE-10 본문 이미지). 조회는 브라우저에서만 — 공연 스코프 레이아웃이 GE-3·접근을 먼저 판정한다 */
export default async function EventDetailPage({
  params,
}: PageProps<'/hosting/events/[eventId]/detail'>) {
  const { eventId } = await params;
  return <EventDetailView eventId={eventId} />;
}
